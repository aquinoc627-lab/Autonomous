import asyncio
import logging
import random
from sqlalchemy import select
from app.models.agent import Agent
from app.core.database import async_session
from app.core.brain import AgentBrain

logger = logging.getLogger(__name__)

# Global flag for autonomous mode
AUTONOMOUS_MODE = False


async def agent_brain_loop():
    """
    Background task that periodically selects an active agent to 'think' and act.
    """
    logger.info("Starting Agent Brain background loop...")

    while True:
        if not AUTONOMOUS_MODE:
            await asyncio.sleep(5)
            continue

        try:
            async with async_session() as db:
                # Get all active agents
                stmt = select(Agent).where(Agent.status == "active")
                result = await db.execute(stmt)
                active_agents = result.scalars().all()

                if not active_agents:
                    logger.debug("No active agents found for autonomous loop.")
                    await asyncio.sleep(10)
                    continue

                # Pick a random agent to think
                agent = random.choice(active_agents)
                logger.info(f"Agent {agent.name} is thinking...")

                # Call the Brain
                action = await AgentBrain.think(db, str(agent.id))
                if action:
                    # Execute the action
                    await AgentBrain.execute_action(db, str(agent.id), action)
                    logger.info(f"Agent {agent.name} action executed.")

        except Exception as e:
            logger.error(f"Error in agent brain loop: {str(e)}")

        # Wait for a random interval between 15 and 45 seconds
        wait_time = random.randint(15, 45)
        await asyncio.sleep(wait_time)


def set_autonomous_mode(enabled: bool):
    global AUTONOMOUS_MODE
    AUTONOMOUS_MODE = enabled
    logger.info(f"Autonomous mode set to: {enabled}")


def get_autonomous_mode() -> bool:
    return AUTONOMOUS_MODE
