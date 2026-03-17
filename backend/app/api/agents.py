from fastapi import APIRouter, Depends
from app.dependencies import require_admin

router = APIRouter()

@router.post("/api/agents")
def create_agent(agent: AgentCreate, current_user: User = Depends(require_admin)):
    # existing logic
    pass

@router.patch("/api/agents/{agent_id}")
def update_agent(agent_id: int, agent: AgentUpdate, current_user: User = Depends(require_admin)):
    # existing logic
    pass

@router.post("/api/agents/{agent_id}/think")
def trigger_agent_think(agent_id: int, current_user: User = Depends(require_admin)):
    # existing logic
    pass

@router.get("/api/agents")
def list_agents(current_user: User = Depends(get_current_user)):
    # existing logic
    pass

@router.get("/api/agents/{agent_id}")
def get_agent(agent_id: int, current_user: User = Depends(get_current_user)):
    # existing logic
    pass

@router.get("/api/agents/{agent_id}/missions")
def get_agent_missions(agent_id: int, current_user: User = Depends(get_current_user)):
    # existing logic
    pass
