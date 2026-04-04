from __future__ import annotations

import os
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.payment_transaction import PaymentTransaction

router = APIRouter()

PACKAGES = {
    "operative_monthly": {"amount": 49.00, "tier": "operative"},
    "operative_annual": {"amount": 490.00, "tier": "operative"},
    "commander_monthly": {"amount": 149.00, "tier": "commander"},
    "commander_annual": {"amount": 1490.00, "tier": "commander"},
    "nexus_prime_monthly": {"amount": 499.00, "tier": "nexus_prime"},
    "nexus_prime_annual": {"amount": 4990.00, "tier": "nexus_prime"},
}

def get_stripe_checkout(request: Request) -> StripeCheckout:
    api_key = os.getenv("STRIPE_API_KEY", "sk_test_emergent")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)

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
    
    stripe_checkout = get_stripe_checkout(request)
    
    checkout_req = CheckoutSessionRequest(
        amount=amount,
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": str(current_user.id),
            "package_id": package_id,
            "target_tier": target_tier
        },
        payment_methods=["card"]
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Create pending transaction
    tx = PaymentTransaction(
        amount=amount,
        currency="usd",
        session_id=session.session_id,
        user_id=str(current_user.id),
        payment_status="pending",
        status="open",
        metadata_data=checkout_req.metadata
    )
    db.add(tx)
    await db.commit()
    
    return {"url": session.url, "session_id": session.session_id}

@router.get("/checkout-status/{session_id}")
async def get_checkout_status(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stripe_checkout = get_stripe_checkout(request)
    try:
        status_res = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # Get transaction
    result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == session_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    # Only update if not already processed
    if tx.payment_status != status_res.payment_status or tx.status != status_res.status:
        tx.payment_status = status_res.payment_status
        tx.status = status_res.status
        
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
    stripe_checkout = get_stripe_checkout(request)
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    if not signature:
        return Response(status_code=400)
        
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
    except Exception as e:
        return Response(content=str(e), status_code=400)
        
    if webhook_response.session_id:
        result = await db.execute(select(PaymentTransaction).where(PaymentTransaction.session_id == webhook_response.session_id))
        tx = result.scalar_one_or_none()
        if tx and tx.payment_status != webhook_response.payment_status:
            tx.payment_status = webhook_response.payment_status
            if tx.payment_status == "paid":
                # Upgrade user
                user_res = await db.execute(select(User).where(User.id == tx.user_id))
                user = user_res.scalar_one_or_none()
                if user and tx.metadata_data.get("target_tier"):
                    user.tier = tx.metadata_data.get("target_tier")
                    db.add(user)
            await db.commit()
            
    return {"status": "success"}
