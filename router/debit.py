from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlmodel import Session, select

from db import get_session
from schemas.debit_model import (
    Debit, DebitCreate, DebitUpdate, DebitResponse, DebitDetailResponse,
    DebitPayment, DebitPaymentCreate, DebitPaymentUpdate, DebitPaymentResponse,
    DebitSummaryResponse, DebitMonthlyStat,
    PaymentMethod, DebitStatus
)
from user.user_crud import require_permission
from user.user_models import User

debit_router = APIRouter(
    prefix="/debit",
    tags=["Debit"],
    responses={404: {"Description": "Not found"}}
)


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _determine_status(amount: Decimal, remaining_balance: Decimal) -> DebitStatus:
    """Single source of truth for status derivation from amount/remaining."""
    if remaining_balance <= 0:
        return DebitStatus.CLEARED
    if remaining_balance < amount:
        return DebitStatus.PARTIALLY_CLEARED
    return DebitStatus.ACTIVE


def _recalculate_debit(db: Session, debit: Debit) -> Debit:
    """Recompute and persist remaining_balance/status for one debit, based on
    its actual debit_payment rows. Called after create, edit (amount change),
    and clear — keeps the stored columns as the source of truth without
    re-aggregating on every read."""
    total_cleared = db.exec(
        select(func.coalesce(func.sum(DebitPayment.cleared_amount), 0))
        .where(DebitPayment.debit_id == debit.id)
    ).one()
    total_cleared = Decimal(total_cleared)
    debit.remaining_balance = debit.amount - total_cleared
    debit.status = _determine_status(debit.amount, debit.remaining_balance)
    db.add(debit)
    db.commit()
    db.refresh(debit)
    return debit


def _get_debit_or_404(db: Session, debit_id: int) -> Debit:
    debit = db.get(Debit, debit_id)
    if not debit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Debit with ID {debit_id} not found"
        )
    return debit


def _to_response(debit: Debit) -> DebitResponse:
    cleared_amount = debit.amount - debit.remaining_balance
    return DebitResponse(
        id=debit.id,
        person_name=debit.person_name,
        debit_date=debit.debit_date,
        amount=debit.amount,
        expected_return_date=debit.expected_return_date,
        payment_method=debit.payment_method,
        receipt_no=debit.receipt_no,
        remarks=debit.remarks,
        created_at=debit.created_at,
        cleared_amount=cleared_amount,
        remaining_balance=debit.remaining_balance,
        status=debit.status
    )


def _to_payment_response(payment: DebitPayment) -> DebitPaymentResponse:
    return DebitPaymentResponse(
        id=payment.id,
        debit_id=payment.debit_id,
        cleared_amount=payment.cleared_amount,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        receipt_no=payment.receipt_no,
        remarks=payment.remarks,
        created_at=payment.created_at
    )


# ============================================================================
# CREATE
# ============================================================================

@debit_router.post("/", response_model=DebitResponse, status_code=status.HTTP_201_CREATED)
def create_debit(
    debit_data: DebitCreate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "add"))]
):
    """Create a new debit (borrowing) record."""
    try:
        new_debit = Debit(
            **debit_data.model_dump(),
            created_by=current_user.id,
            remaining_balance=debit_data.amount,
            status=DebitStatus.ACTIVE
        )
        db.add(new_debit)
        db.commit()
        db.refresh(new_debit)
        return _to_response(new_debit)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating debit: {str(e)}"
        )


# ============================================================================
# LIST / FILTER
# ============================================================================

@debit_router.get("/all", response_model=List[DebitResponse])
def get_all_debits(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "view"))],
    date_from: Optional[date] = Query(None, description="Filter debit_date >= (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter debit_date <= (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(
        None, alias="status",
        description="Comma-separated statuses, e.g. 'ACTIVE,PARTIALLY_CLEARED'"
    ),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    person_name: Optional[str] = Query(None, description="Case-insensitive partial match on person name"),
):
    """List debits with optional filters. Status/remaining_balance are read
    directly from stored columns, kept current by _recalculate_debit()."""
    try:
        query = select(Debit)

        if date_from:
            query = query.where(Debit.debit_date >= date_from)
        if date_to:
            query = query.where(Debit.debit_date <= date_to)
        if status_filter:
            statuses = [s.strip().upper() for s in status_filter.split(",") if s.strip()]
            valid_statuses = [s for s in statuses if s in DebitStatus.__members__]
            if valid_statuses:
                query = query.where(Debit.status.in_(valid_statuses))
        if payment_method:
            query = query.where(Debit.payment_method == payment_method)
        if person_name:
            query = query.where(Debit.person_name.ilike(f"%{person_name}%"))

        query = query.order_by(Debit.debit_date.desc(), Debit.id.desc())
        debits = db.exec(query).all()
        return [_to_response(d) for d in debits]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching debits: {str(e)}"
        )


# ============================================================================
# SUMMARY (Comparison page)
# Declared before /{debit_id} — FastAPI matches path routes in declaration
# order, so "/debit/summary" must come first or it'll be swallowed by
# "/debit/{debit_id}" with debit_id="summary".
# ============================================================================

@debit_router.get("/summary", response_model=DebitSummaryResponse)
def get_debit_summary(
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "view"))]
):
    """Aggregate totals + monthly breakdown for the Comparison page. Reads
    stored remaining_balance/status directly — no per-row payment
    aggregation needed here since those columns are already kept current."""
    try:
        debits = db.exec(select(Debit)).all()

        total_debit_taken = sum((d.amount for d in debits), Decimal("0"))
        total_outstanding = sum((d.remaining_balance for d in debits), Decimal("0"))
        total_debit_cleared = total_debit_taken - total_outstanding

        active_count = sum(1 for d in debits if d.status == DebitStatus.ACTIVE)
        partially_cleared_count = sum(1 for d in debits if d.status == DebitStatus.PARTIALLY_CLEARED)
        cleared_count = sum(1 for d in debits if d.status == DebitStatus.CLEARED)

        # Monthly: "taken" grouped by debit_date's month/year, "cleared" grouped
        # by each DebitPayment's payment_date month/year.
        monthly_map: dict[tuple[int, int], dict[str, Decimal]] = {}

        for d in debits:
            if isinstance(d.debit_date, datetime):
                dt = d.debit_date.date()
            else:
                dt = d.debit_date
            key = (dt.year, dt.month)
            monthly_map.setdefault(key, {"taken": Decimal("0"), "cleared": Decimal("0")})
            monthly_map[key]["taken"] += d.amount

        payments = db.exec(select(DebitPayment)).all()
        for p in payments:
            if isinstance(p.payment_date, datetime):
                dt = p.payment_date.date()
            else:
                dt = p.payment_date
            key = (dt.year, dt.month)
            monthly_map.setdefault(key, {"taken": Decimal("0"), "cleared": Decimal("0")})
            monthly_map[key]["cleared"] += p.cleared_amount

        monthly = [
            DebitMonthlyStat(year=year, month=month, taken=vals["taken"], cleared=vals["cleared"])
            for (year, month), vals in sorted(monthly_map.items())
        ]

        return DebitSummaryResponse(
            total_debit_taken=total_debit_taken,
            total_debit_cleared=total_debit_cleared,
            total_outstanding=total_outstanding,
            active_count=active_count,
            partially_cleared_count=partially_cleared_count,
            cleared_count=cleared_count,
            monthly=monthly
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching debit summary: {str(e)}"
        )


# ============================================================================
# SINGLE + PAYMENT HISTORY
# ============================================================================

@debit_router.get("/{debit_id}", response_model=DebitDetailResponse)
def get_debit(
    debit_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "view"))]
):
    """Get one debit with its full payment history."""
    debit = _get_debit_or_404(db, debit_id)
    payments = db.exec(
        select(DebitPayment)
        .where(DebitPayment.debit_id == debit_id)
        .order_by(DebitPayment.payment_date.desc(), DebitPayment.id.desc())
    ).all()
    base = _to_response(debit)
    return DebitDetailResponse(
        **base.model_dump(),
        payments=[_to_payment_response(p) for p in payments]
    )


# ============================================================================
# EDIT
# ============================================================================

@debit_router.patch("/{debit_id}", response_model=DebitResponse)
def update_debit(
    debit_id: int,
    debit_data: DebitUpdate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "edit"))]
):
    """Edit a debit's base fields. If amount changes, remaining_balance and
    status are recalculated against existing payments — rejected if the new
    amount would be less than what's already been cleared."""
    try:
        debit = _get_debit_or_404(db, debit_id)

        update_fields = debit_data.model_dump(exclude_unset=True)

        if "amount" in update_fields and update_fields["amount"] is not None:
            already_cleared = debit.amount - debit.remaining_balance
            if update_fields["amount"] < already_cleared:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot set amount below Rs {already_cleared} — "
                        f"that much has already been cleared against this debit."
                    )
                )

        for field, value in update_fields.items():
            setattr(debit, field, value)

        db.add(debit)
        db.commit()
        db.refresh(debit)

        # Recalculate whether or not amount changed, cheap and keeps things honest
        debit = _recalculate_debit(db, debit)
        return _to_response(debit)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating debit: {str(e)}"
        )


# ============================================================================
# DELETE (blocked if payments exist — accidental-loss safeguard)
# ============================================================================

@debit_router.delete("/{debit_id}", status_code=status.HTTP_200_OK, response_model=dict)
def delete_debit(
    debit_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "delete"))]
):
    """Delete a debit. Blocked (400, not a crash) if any clearance payments
    exist against it — deleting would silently erase payment history, so
    this is a hard guard rather than a cascade."""
    try:
        debit = _get_debit_or_404(db, debit_id)

        payment_count = db.exec(
            select(func.count(DebitPayment.id)).where(DebitPayment.debit_id == debit_id)
        ).one()

        if payment_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot delete: this debit has {payment_count} clearance "
                    f"payment(s) recorded. Deleting it would erase that payment "
                    f"history. Remove the clearance payments first if you're sure."
                )
            )

        db.delete(debit)
        db.commit()
        return {"message": "Debit deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting debit: {str(e)}"
        )


# ============================================================================
# CLEAR DEBIT (add a DebitPayment)
# ============================================================================

@debit_router.post("/{debit_id}/clear", response_model=DebitResponse, status_code=status.HTTP_201_CREATED)
def clear_debit(
    debit_id: int,
    payment_data: DebitPaymentCreate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "edit"))]
):
    """Record a clearance payment against a debit. Uses the debit's current
    stored remaining_balance rather than a generic 400 — tells the user
    plainly whether it's already fully cleared or the entered amount is
    too high."""
    try:
        debit = _get_debit_or_404(db, debit_id)

        if debit.remaining_balance <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This debit has already been fully cleared."
            )

        if payment_data.cleared_amount > debit.remaining_balance:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Entered amount (Rs {payment_data.cleared_amount}) exceeds the "
                    f"remaining balance of Rs {debit.remaining_balance}."
                )
            )

        if payment_data.cleared_amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cleared amount must be greater than zero."
            )

        new_payment = DebitPayment(
            debit_id=debit_id,
            cleared_amount=payment_data.cleared_amount,
            payment_date=payment_data.payment_date,
            payment_method=payment_data.payment_method,
            receipt_no=payment_data.receipt_no,
            remarks=payment_data.remarks,
            created_by=current_user.id
        )
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)

        debit = _recalculate_debit(db, debit)
        return _to_response(debit)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing debit: {str(e)}"
        )


def _get_payment_or_404(db: Session, payment_id: int) -> DebitPayment:
    payment = db.get(DebitPayment, payment_id)
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Debit payment with ID {payment_id} not found"
        )
    return payment


@debit_router.put("/payment/{payment_id}", response_model=DebitPaymentResponse)
def update_debit_payment(
    payment_id: int,
    payment_data: DebitPaymentUpdate,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "edit"))]
):
    try:
        payment = _get_payment_or_404(db, payment_id)
        debit = _get_debit_or_404(db, payment.debit_id)

        update_fields = payment_data.model_dump(exclude_unset=True)

        if "cleared_amount" in update_fields and update_fields["cleared_amount"] is not None:
            if update_fields["cleared_amount"] <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cleared amount must be greater than zero."
                )
            total_other_cleared = db.exec(
                select(func.coalesce(func.sum(DebitPayment.cleared_amount), 0))
                .where(DebitPayment.debit_id == debit.id)
                .where(DebitPayment.id != payment.id)
            ).one()
            total_other_cleared = Decimal(total_other_cleared)
            new_total_cleared = total_other_cleared + update_fields["cleared_amount"]
            if new_total_cleared > debit.amount:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Total cleared amount cannot exceed debit amount of Rs {debit.amount}."
                    )
                )

        for field, value in update_fields.items():
            setattr(payment, field, value)

        db.add(payment)
        db.commit()
        db.refresh(payment)

        _recalculate_debit(db, debit)
        return _to_payment_response(payment)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating debit payment: {str(e)}"
        )


@debit_router.delete("/payment/{payment_id}", status_code=status.HTTP_200_OK, response_model=dict)
def delete_debit_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(require_permission("debit", "delete"))]
):
    try:
        payment = _get_payment_or_404(db, payment_id)
        debit = _get_debit_or_404(db, payment.debit_id)
        db.delete(payment)
        db.commit()

        _recalculate_debit(db, debit)
        return {"message": "Debit payment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting debit payment: {str(e)}"
        )

