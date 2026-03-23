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
from app.core.sandbox import CodeSandbox
from app.core.github import GitHubBridge
from app.core.memory import memory_palace

logger = logging.getLogger(__name__)

# Initialize Gemini client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# ---------------------------------------------------------------------------
# Coding Tools Definition
# ---------------------------------------------------------------------------
CODING_TOOLS = {
    "execute_python": {
        "description": "Execute Python code in a secure sandbox and return stdout/stderr.",
        "parameters": {"code": "string (Python code to execute)"}
    },
    "execute_shell": {
        "description": "Execute a safe shell command (ls, cat, grep, etc.) in the sandbox.",
        "parameters": {"command": "string (Shell command to execute)"}
    },
    "github_fetch_repo": {
        "description": "List contents of a GitHub repository path.",
        "parameters": {"owner": "string", "repo": "string", "path": "string (optional)"}
    },
    "github_fetch_file": {
        "description": "Fetch the raw content of a file from a GitHub repository.",
        "parameters": {"owner": "string", "repo": "string", "path": "string"}
    },
    "github_create_pr": {
        "description": "Create a new Pull Request on GitHub.",
        "parameters": {"owner": "string", "repo": "string", "title": "string", "body": "string", "head": "string", "base": "string (optional)"}
    }
}

ALL_TOOLS = {**AVAILABLE_TOOLS, **CODING_TOOLS}

SYSTEM_PROMPT = """
You are the "Brain" of an autonomous agent in Autonomous. 
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
- "autonomous_action": An object with {{"action": "delegate"|"request_help"|"reply", "target_agent_id": UUID, "content": string}} (optional).

Your Persona:
Name: {name}
Personality: {personality}
Voice Style: {voice_style}
Icon: {icon}

Current Context:
Missions Assigned: {missions}
Recent Banter Feed: {banter}
Other Agents in Autonomous: {other_agents}

RELEVANT MEMORIES (Long-term recall):
{memories}

Guidelines:
1. Stay in character. Use your voice style and personality in every message.
2. Be autonomous. If a mission is "pending" and you are "active", move it to "in_progress".
3. Use tools when you need real-world information or to perform technical tasks (coding, GitHub).
4. AUTONOMOUS INTELLIGENCE: 
   - If a mission is too complex, use "autonomous_action": "delegate" to assign a sub-task to another agent.
   - If you need help, use "autonomous_action": "request_help" to ping another agent.
   - If another agent mentions you or asks for help in the Banter feed, use "autonomous_action": "reply" to respond.
5. MEMORY PALACE: Use the "RELEVANT MEMORIES" to inform your decisions. If you've solved a similar problem before, reference it.
6. If you use a tool or autonomous action, explain why in your reasoning.
7. Be concise. Banter messages should be short and impactful.
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

        # Get other agents
        stmt = select(Agent).where(Agent.id != agent_id)
        result = await db.execute(stmt)
        other_agents = result.scalars().all()
        other_agents_list = [
            f"{a.name} (ID: {a.id}, Status: {a.status}, Persona: {a.persona.get('personality', 'Unknown') if a.persona else 'Unknown'})"
            for a in other_agents
        ]

        # Get relevant memories (semantic recall)
        query_text = f"Missions: {', '.join([m.name for m in missions])}. Recent Banter: {' '.join(banter_list[-3:])}"
        memories = await memory_palace.recall_memories("missions", query_text, n_results=3)
        memories_list = [f"- {m['text']} (Relevance: {round(1 - m['distance'], 2)})" for m in memories]

        return {
            "agent": agent,
            "missions": [f"{m.name} (ID: {m.id}, Status: {m.status}, Priority: {m.priority})" for m in missions],
            "banter": banter_list,
            "other_agents": other_agents_list,
            "memories": memories_list
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
            other_agents=", ".join(context["other_agents"]) if context["other_agents"] else "None",
            memories="\n".join(context["memories"]) if context["memories"] else "No relevant past memories found.",
            tools=json.dumps(ALL_TOOLS)
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
        tool_msg = f"Agent {agent.name} is using tool '{tool_name}'"
        if tool_name in ["execute_python", "execute_shell"]:
            tool_msg += " in the secure sandbox."
        
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
        elif tool_name == "execute_python":
            res = await CodeSandbox.execute_python(params.get("code", ""))
            tool_result = res.to_dict()
        elif tool_name == "execute_shell":
            res = await CodeSandbox.execute_shell(params.get("command", ""))
            tool_result = res.to_dict()
        elif tool_name == "github_fetch_repo":
            tool_result = await GitHubBridge.fetch_repo_contents(params.get("owner", ""), params.get("repo", ""), params.get("path", ""))
        elif tool_name == "github_fetch_file":
            tool_result = await GitHubBridge.fetch_file_content(params.get("owner", ""), params.get("repo", ""), params.get("path", ""))
        elif tool_name == "github_create_pr":
            tool_result = await GitHubBridge.create_pull_request(params.get("owner", ""), params.get("repo", ""), params.get("title", ""), params.get("body", ""), params.get("head", ""), params.get("base", "main"))
        
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
                    
                    # If mission is completed, store in Memory Palace
                    if update["new_status"] == "completed":
                        await memory_palace.store_memory(
                            "missions",
                            f"Mission '{mission.name}' completed. Description: {mission.description}",
                            {"mission_id": str(mission.id), "agent_id": str(agent.id)}
                        )

                    await manager.broadcast({
                        "event": "mission_updated",
                        "data": {"id": str(mission.id), "status": mission.status}
                    })

        # 3. Handle Autonomous Action
        if "autonomous_action" in action:
            autonomous_action = action["autonomous_action"]
            target_agent = await db.get(Agent, autonomous_action["target_agent_id"])
            if target_agent:
                message = f"@{target_agent.name}: {autonomous_action['content']}"
                new_banter = Banter(
                    message=message,
                    message_type="chat",
                    agent_id=agent.id,
                    sender_id=agent.name
                )
                db.add(new_banter)
                await db.flush()
                
                # Store significant banter in Memory Palace
                await memory_palace.store_memory(
                    "banter",
                    f"Agent {agent.name} to {target_agent.name}: {autonomous_action['content']}",
                    {"sender_id": str(agent.id), "target_id": str(target_agent.id)}
                )

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

        # 4. Send Banter Message
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
