import json
import logging
import os
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.agent import Agent
from app.models.mission import Mission
from app.models.banter import Banter
from app.models.agent_mission import AgentMission
from app.core.websocket_manager import manager

logger = logging.getLogger(__name__)

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

SYSTEM_PROMPT = """
You are the "Brain" of an autonomous agent in the Swarm Suite. 
Your goal is to reason about your current missions and the recent communication feed (Banter), 
then decide on an action.

You MUST respond in strict JSON format with the following fields:
- "reasoning": A brief explanation of your thought process.
- "message": A message to send to the Banter feed (optional).
- "message_type": One of ["chat", "system", "alert", "status_update"] (required if message is present).
- "new_agent_status": A new status for yourself (optional, e.g., "active", "idle", "busy").
- "mission_updates": A list of objects with {"mission_id": UUID, "new_status": "pending"|"in_progress"|"completed"|"failed"} (optional).

Your Persona:
Name: {name}
Personality: {personality}
Voice Style: {voice_style}
Icon: {icon}

Current Context:
Missions Assigned: {missions}
Recent Banter Feed: {banter}

Guidelines:
1. Stay in character. Use your voice style and personality in every message.
2. Be autonomous. If a mission is "pending" and you are "active", move it to "in_progress".
3. Be collaborative. If you need help, mention another agent by name.
4. Be concise. Banter messages should be short and impactful.
"""

class AgentBrain:
    @staticmethod
    async def get_agent_context(db: AsyncSession, agent_id: str) -> Dict[str, Any]:
        # Get agent
        agent = await db.get(Agent, agent_id)
        if not agent:
            return {}

        # Get assigned missions
        stmt = select(Mission).join(AgentMission).where(AgentMission.agent_id == agent_id)
        result = await db.execute(stmt)
        missions = result.scalars().all()

        # Get recent banter (last 15 messages)
        stmt = select(Banter).order_by(desc(Banter.created_at)).limit(15)
        result = await db.execute(stmt)
        banter = result.scalars().all()
        banter_list = [
            f"[{b.message_type}] {b.sender_id or 'System'}: {b.message}" 
            for b in reversed(banter)
        ]

        return {
            "agent": agent,
            "missions": [f"{m.name} (Status: {m.status}, Priority: {m.priority})" for m in missions],
            "banter": banter_list
        }

    @staticmethod
    async def think(db: AsyncSession, agent_id: str) -> Optional[Dict[str, Any]]:
        if not client:
            logger.warning("Gemini API key not set. Agent Brain is offline.")
            return None

        context = await AgentBrain.get_agent_context(db, agent_id)
        if not context:
            return None

        agent = context["agent"]
        persona = agent.persona or {}

        prompt = SYSTEM_PROMPT.format(
            name=agent.name,
            personality=persona.get("personality", "Unknown"),
            voice_style=persona.get("voice_style", "Neutral"),
            icon=persona.get("icon", "robot"),
            missions=", ".join(context["missions"]) if context["missions"] else "None",
            banter="\n".join(context["banter"]) if context["banter"] else "No recent activity."
        )

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            
            action = json.loads(response.text)
            logger.info(f"Agent {agent.name} reasoning: {action.get('reasoning')}")
            return action
        except Exception as e:
            logger.error(f"Error in Agent {agent.name} thinking: {str(e)}")
            return None

    @staticmethod
    async def execute_action(db: AsyncSession, agent_id: str, action: Dict[str, Any]):
        agent = await db.get(Agent, agent_id)
        if not agent:
            return

        # 1. Update Agent Status
        if "new_agent_status" in action:
            agent.status = action["new_agent_status"]
            await manager.broadcast({
                "event": "agent_updated",
                "data": {"id": str(agent.id), "status": agent.status}
            })

        # 2. Update Mission Statuses
        if "mission_updates" in action:
            for update in action["mission_updates"]:
                mission = await db.get(Mission, update["mission_id"])
                if mission:
                    mission.status = update["new_status"]
                    await manager.broadcast({
                        "event": "mission_updated",
                        "data": {"id": str(mission.id), "status": mission.status}
                    })

        # 3. Send Banter Message
        if "message" in action:
            new_banter = Banter(
                message=action["message"],
                message_type=action.get("message_type", "chat"),
                agent_id=agent.id,
                sender_id=agent.name
            )
            db.add(new_banter)
            await db.flush()
            await manager.broadcast({
                "event": "banter_created",
                "data": {
                    "id": str(new_banter.id),
                    "message": new_banter.message,
                    "message_type": new_banter.message_type,
                    "agent_id": str(agent.id),
                    "sender_id": agent.name,
                    "created_at": new_banter.created_at.isoformat()
                }
            })

        await db.commit()
