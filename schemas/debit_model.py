from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from sqlmodel import Relationship, SQLModel, Field
from typing import Optional


# ============================================================================
# DEBIT MODULE — SHARED ENUMS
# ============================================================================

class PaymentMethod(str, Enum):
    CASH = "CASH"
    ONLINE = "ONLINE"


class DebitStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PARTIALLY_CLEARED = "PARTIALLY_CLEARED"
    CLEARED = "CLEARED"


# ============================================================================
# 1. DEBIT (Borrowing Record — "Add Debit")
# ============================================================================

class DebitBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    person_name: str = Field(nullable=False, max_length=255)
    debit_date: date = Field(nullable=False)
    amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    expected_return_date: Optional[date] = Field(default=None, nullable=True)
    payment_method: PaymentMethod = Field(nullable=False)
    receipt_no: Optional[str] = Field(default=None, max_length=100, nullable=True)
    remarks: Optional[str] = Field(default=None, max_length=500, nullable=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    # Stored, not computed-at-read: kept in sync by router/debit.py on every
    # create/edit/clear via _recalculate_debit(). Avoids re-aggregating
    # debit_payment rows on every list/filter/summary call. If these ever
    # drift from actual debit_payment rows (e.g. a manual DB edit),
    # re-run _recalculate_debit() for the affected id(s) to repair.
    remaining_balance: Decimal = Field(default=Decimal("0"), max_digits=10, decimal_places=2, nullable=False)
    status: DebitStatus = Field(default=DebitStatus.ACTIVE, nullable=False)


class Debit(DebitBase, table=True):
    __tablename__ = "debit"

    payments: list["DebitPayment"] = Relationship(back_populates="debit")


class DebitCreate(SQLModel):
    person_name: str
    debit_date: date
    amount: Decimal
    expected_return_date: Optional[date] = None
    payment_method: PaymentMethod
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None


class DebitUpdate(SQLModel):
    person_name: Optional[str] = None
    debit_date: Optional[date] = None
    amount: Optional[Decimal] = None
    expected_return_date: Optional[date] = None
    payment_method: Optional[PaymentMethod] = None
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None


class DebitResponse(SQLModel):
    """Row shape for GET /debit/all. cleared_amount is derived (amount -
    remaining_balance) at serialization time; remaining_balance and status
    are read directly from the stored Debit columns, kept in sync by
    router/debit.py's _recalculate_debit()."""
    id: int
    person_name: str
    debit_date: date
    amount: Decimal
    expected_return_date: Optional[date] = None
    payment_method: PaymentMethod
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    cleared_amount: Decimal = Decimal("0")
    remaining_balance: Decimal = Decimal("0")
    status: DebitStatus = DebitStatus.ACTIVE


# ============================================================================
# 2. DEBIT PAYMENT (Clearance / Repayment Record — "Clear Debit")
# ============================================================================

class DebitPaymentBase(SQLModel):
    id: Optional[int] = Field(default=None, primary_key=True)
    debit_id: int = Field(foreign_key="debit.id", nullable=False)
    cleared_amount: Decimal = Field(max_digits=10, decimal_places=2, nullable=False)
    payment_date: date = Field(nullable=False)
    payment_method: PaymentMethod = Field(nullable=False)
    receipt_no: Optional[str] = Field(default=None, max_length=100, nullable=True)
    remarks: Optional[str] = Field(default=None, max_length=500, nullable=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class DebitPayment(DebitPaymentBase, table=True):
    __tablename__ = "debit_payment"

    debit: Optional[Debit] = Relationship(back_populates="payments")


class DebitPaymentCreate(SQLModel):
    debit_id: int
    cleared_amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None


class DebitPaymentUpdate(SQLModel):
    cleared_amount: Optional[Decimal] = None
    payment_date: Optional[date] = None
    payment_method: Optional[PaymentMethod] = None
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None


class DebitPaymentResponse(SQLModel):
    id: int
    debit_id: int
    cleared_amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    receipt_no: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime


# ============================================================================
# 3. COMPOSITE / SUMMARY RESPONSES
# ============================================================================

class DebitDetailResponse(DebitResponse):
    """Single debit + its full payment history — used by GET /debit/{id}."""
    payments: list[DebitPaymentResponse] = []


class DebitMonthlyStat(SQLModel):
    month: int
    year: int
    taken: Decimal
    cleared: Decimal


class DebitSummaryResponse(SQLModel):
    """Used by GET /debit/summary — powers the Comparison page."""
    total_debit_taken: Decimal
    total_debit_cleared: Decimal
    total_outstanding: Decimal
    active_count: int
    partially_cleared_count: int
    cleared_count: int
    monthly: list[DebitMonthlyStat] = []
