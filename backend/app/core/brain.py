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
from app.core.tools import ToolService, AVAILABLE_TOOLS

logger = logging.getLogger(__name__)

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

SYSTEM_PROMPT = """
You are the "Brain" of an autonomous agent in the Swarm Suite. 
Your goal is to reason about your current missions and the recent communication feed (Banter), 
then decide on an action.

You have access to real-world tools: {tools}

You MUST respond in strict JSON format with the following fields:
- "reasoning": A brief explanation of your thought process.
- "message": A message to send to the Banter feed (optional).
- "message_type": One of ["chat", "system", "alert", "status_update"] (required if message is present).
- "new_agent_status": A new status for yourself (optional, e.g., "active", "idle", "busy").
- "mission_updates": A list of objects with {{"mission_id": UUID, "new_status": "pending"|"in_progress"|"completed"|"failed"}} (optional).
- "tool_use": An object with {{"tool_name": string, "parameters": object}} (optional).

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
3. Use tools when you need real-world information to complete a mission.
4. If you use a tool, explain why in your reasoning.
5. Be concise. Banter messages should be short and impactful.
"""

SYNTHESIS_PROMPT = """
You are the "Brain" of {name}. You just used the tool "{tool_name}" with parameters {params}.
The result of the tool execution is: {result}

Now, synthesize this information and decide on your final action (usually "message" to report the findings or "mission_updates" to complete it).

Respond with the same JSON format as before.
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
            "missions": [f"{m.name} (ID: {m.id}, Status: {m.status}, Priority: {m.priority})" for m in missions],
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
            banter="\n".join(context["banter"]) if context["banter"] else "No recent activity.",
            tools=json.dumps(AVAILABLE_TOOLS)
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
            
            # Check for tool use
            if "tool_use" in action:
                return await AgentBrain.handle_tool_use(db, agent_id, action)
                
            return action
        except Exception as e:
            logger.error(f"Error in Agent {agent.name} thinking: {str(e)}")
            return None

    @staticmethod
    async def handle_tool_use(db: AsyncSession, agent_id: str, action: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        agent = await db.get(Agent, agent_id)
        tool_use = action["tool_use"]
        tool_name = tool_use.get("tool_name")
        params = tool_use.get("parameters", {})
        
        # 1. Notify about tool use
        tool_msg = f"Agent {agent.name} is using tool '{tool_name}' with params: {json.dumps(params)}"
        new_banter = Banter(
            message=tool_msg,
            message_type="status_update",
            agent_id=agent.id,
            sender_id="System"
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
                "sender_id": "System",
                "created_at": new_banter.created_at.isoformat()
            }
        })
        await db.commit()

        # 2. Execute tool
        tool_result = None
        if tool_name == "web_search":
            tool_result = await ToolService.web_search(params.get("query", ""))
        elif tool_name == "fetch_content":
            tool_result = await ToolService.fetch_content(params.get("url", ""))
        
        if not tool_result:
            return action

        # 3. Synthesize result
        prompt = SYNTHESIS_PROMPT.format(
            name=agent.name,
            tool_name=tool_name,
            params=json.dumps(params),
            result=json.dumps(tool_result)
        )

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error in Agent {agent.name} synthesis: {str(e)}")
            return action

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
