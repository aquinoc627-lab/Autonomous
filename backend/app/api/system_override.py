from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import record_audit
from app.core.tasks import set_autonomous_mode
from app.models.user import User
from app.models.mission import Mission
from app.models.banter import Banter
import uuid

router = APIRouter()


@router.post("/abort-all", status_code=200)
async def abort_all_missions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    THE KILL SWITCH
    Instantly halt all running missions, disable autonomous mode,
    and log an immutable, tamper-proof audit entry.
    """
    if current_user.role != "admin" and current_user.tier != "nexus_prime":
        raise HTTPException(status_code=403, detail="Emergency Override requires Admin Role or Nexus Prime clearance.")

    # 1. Disable global autonomous AI logic loop
    set_autonomous_mode(False)

    # 2. Mark all active/pending missions as failed/aborted
    active_missions_res = await db.execute(
        select(Mission).where(Mission.status.in_(["in_progress", "pending"]))
    )
    active_missions = active_missions_res.scalars().all()

    count = 0
    for m in active_missions:
        m.status = "failed"
        count += 1

        # Broadcast critical system alert
        alert = Banter(
            id=str(uuid.uuid4()),
            message=f"CRITICAL SYSTEM OVERRIDE: Mission {m.name} forcibly aborted by human operator {current_user.username}.",
            message_type="alert",
            mission_id=m.id,
            sender_id=current_user.id
        )
        db.add(alert)

    await db.commit()

    # 3. Create tamper-proof audit record
    client_ip = request.client.host if request.client else "0.0.0.0"
    await record_audit(
        db,
        user_id=current_user.id,
        action="ABORT_ALL_MISSIONS_INITIATED",
        entity_type="system",
        entity_id=None,
        details={
            "description": "EMERGENCY KILL SWITCH ACTIVATED.",
            "missions_aborted": count,
            "autonomous_mode_disabled": True,
            "operator_clearance": current_user.tier
        },
        ip_address=client_ip
    )

    return {
        "status": "success",
        "message": f"Global Emergency Override Executed. {count} missions halted. AI disabled."
    }
