from __future__ import annotations
from typing import Optional
from sqlalchemy import String, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class PaymentTransaction(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "payment_transactions"

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="usd")
    session_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    metadata_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
