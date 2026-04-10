from __future__ import annotations

import logging
import os
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.payment_transaction import PaymentTransaction

router = APIRouter()
logger = logging.getLogger(__name__)

PACKAGES = {
    "operative_monthly": {"amount": 49.00, "tier": "operative"},
    "operative_annual": {"amount": 490.00, "tier": "operative"},
    "commander_monthly": {"amount": 149.00, "tier": "commander"},
    "commander_annual": {"amount": 1490.00, "tier": "commander"},
    "nexus_prime_monthly": {"amount": 499.00, "tier": "nexus_prime"},
    "nexus_prime_annual": {"amount": 4990.00, "tier": "nexus_prime"},
}


def get_stripe_api_key() -> str:
    """Return the Stripe API key, raising a 503 if not configured."""
    key = os.getenv("STRIPE_API_KEY")
    if not key:
        logger.error("STRIPE_API_KEY environment variable is not set.")
        raise HTTPException(status_code=503, detail="Billing service is not configured.")
    return key


def get_webhook_secret() -> str:
    return os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/create-checkout-session")
async def create_checkout_session(
    request: Request,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    package_id = body.get("package_id")
    origin_url = body.get("origin_url")

    if package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package ID")
    if not origin_url:
        raise HTTPException(status_code=400, detail="Origin URL is required")

    amount = PACKAGES[package_id]["amount"]
    target_tier = PACKAGES[package_id]["tier"]

    success_url = f"{origin_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/billing"

    stripe.api_key = get_stripe_api_key()

    metadata = {
        "user_id": str(current_user.id),
        "package_id": package_id,
        "target_tier": target_tier,
    }

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": int(amount * 100),  # Stripe expects cents
                "product_data": {
                    "name": f"Autonomous - {target_tier.replace('_', ' ').title()}",
                },
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    # Create pending transaction
    tx = PaymentTransaction(
        amount=amount,
        currency="usd",
        session_id=session.id,
        user_id=str(current_user.id),
        payment_status="pending",
        status="open",
        metadata_data=metadata,
    )
    db.add(tx)
    await db.commit()

    return {"url": session.url, "session_id": session.id}


@router.get("/checkout-status/{session_id}")
async def get_checkout_status(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stripe.api_key = get_stripe_api_key()
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Get transaction
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == session_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    payment_status = session.payment_status
    status = session.status

    # Only update if not already processed
    if tx.payment_status != payment_status or tx.status != status:
        tx.payment_status = payment_status
        tx.status = status

        if tx.payment_status == "paid":
            # Upgrade user tier
            target_tier = tx.metadata_data.get("target_tier")
            if target_tier:
                current_user.tier = target_tier
                db.add(current_user)

        await db.commit()

    return {"payment_status": tx.payment_status, "status": tx.status}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")

    if not signature:
        return Response(status_code=400)

    webhook_secret = get_webhook_secret()
    try:
        event = stripe.Webhook.construct_event(body, signature, webhook_secret)
    except Exception as e:
        return Response(content=str(e), status_code=400)

    if event.type == "checkout.session.completed":
        session = event.data.object
        session_id = session.id
        payment_status = session.payment_status

        result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == session_id))
        tx = result.scalar_one_or_none()
        if tx and tx.payment_status != payment_status:
            tx.payment_status = payment_status
            if tx.payment_status == "paid":
                # Upgrade user
                user_res = await db.execute(select(User).where(User.id == tx.user_id))
                user = user_res.scalar_one_or_none()
                if user and tx.metadata_data.get("target_tier"):
                    user.tier = tx.metadata_data.get("target_tier")
                    db.add(user)
            await db.commit()

    return {"status": "success"}
