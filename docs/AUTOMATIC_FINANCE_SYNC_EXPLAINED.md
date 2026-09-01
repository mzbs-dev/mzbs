# Automatic Finance Synchronization Explained

## Overview

The MMS system automatically synchronizes financial records between payroll (Salary/Allowance) and accounting (Income/Expense) modules using a **Finance Sync Service**. This ensures accounting records stay synchronized with payroll transactions without manual data entry.

---

## Architecture

### Three Main Sync Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                   AUTOMATIC SYNCHRONIZATION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. SALARY PAYMENT → EXPENSE                                    │
│     └─ When salary paid, auto-creates expense record            │
│                                                                 │
│  2. ALLOWANCE → EXPENSE                                         │
│     └─ When allowance created, auto-creates expense record      │
│                                                                 │
│  3. PAID FEE → INCOME                                           │
│     └─ When fee marked as paid, auto-creates income record      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Database Schema Enhancement

Both `Income` and `Expense` models have two special fields for tracking the source:

```python
# In schemas/income_model.py
class Income(IncomeBase, table=True):
    # ... other fields ...
    source_type: Optional[str] = Field(default=None, index=True)  # "fee"
    source_id: Optional[int] = Field(default=None, index=True)    # fee.fee_id

# In schemas/expense_model.py
class Expense(ExpenseBase, table=True):
    # ... other fields ...
    source_type: Optional[str] = Field(default=None, index=True)  # "salary_payment" or "allowance"
    source_id: Optional[int] = Field(default=None, index=True)    # payment.id or allowance.id
```

**Why these fields?**
- **Linkage**: Links the auto-generated income/expense back to the original transaction
- **Tracking**: Identifies auto-generated vs. manual records
- **Protection**: Prevents deletion of auto-generated records (forces source deletion)
- **Uniqueness**: Ensures one-to-one relationship (prevents duplicate income/expense for same transaction)

---

## Flow 1: Salary Payment → Expense

### Code Location
- **Service**: [services/finance_sync_service.py](services/finance_sync_service.py#L165-L220)
- **Router**: [router/salary.py](router/salary.py#L699-L741)

### Workflow

```
1. Admin clicks "Pay Salary" for Teacher
   ↓
2. Creates SalaryPayment record in database
   ↓
3. Automatically calls sync_expense_for_salary_payment()
   ↓
4. Function checks: Does expense with source_type="salary_payment" 
   and source_id=payment.id already exist?
   ├─ YES → Update existing expense (amount, date, teacher_name)
   └─ NO → Create new Expense record
   ↓
5. Expense record automatically appears in Income/Expense module
```

### Code Example

```python
# In router/salary.py - create_salary_payment()
new_payment = SalaryPayment(
    teacher_id=payment_data.teacher_id,
    ledger_id=payment_data.ledger_id,
    amount=payment_data.amount,
    payment_date=payment_data.payment_date
)
db.add(new_payment)
db.commit()
db.refresh(new_payment)

# AUTO-SYNC: Sync to expense record
try:
    sync_expense_for_salary_payment(db, new_payment, teacher.teacher_name)
    linked_expense_created = True
except Exception as sync_error:
    print(f"Warning: Failed to sync expense for salary payment: {str(sync_error)}")
```

### Created Expense Record

```python
Expense(
    recipt_number=None,
    date=payment.payment_date,           # Payment date
    category_id=<Salary Category ID>,    # "تنخواہ" (Salary)
    to_whom=teacher_name,                # Teacher name
    description="Auto-generated from Salary Payment ID 42",
    amount=payment.amount,               # Salary amount
    source_type="salary_payment",        # Links back to payment
    source_id=payment.id,                # Links back to payment ID
    created_at=datetime.utcnow()
)
```

---

## Flow 2: Allowance → Expense

### Code Location
- **Service**: [services/finance_sync_service.py](services/finance_sync_service.py#L270-L320)
- **Router**: [router/salary.py](router/salary.py#L905-L960)

### Workflow

```
1. Admin creates Allowance for Teacher (e.g., Bonus, Travel)
   ↓
2. Creates Allowance record in database
   ↓
3. Recalculates salary ledger totals
   ↓
4. Automatically calls sync_expense_for_allowance()
   ↓
5. Function checks: Does expense with source_type="allowance" 
   and source_id=allowance.id already exist?
   ├─ YES → Update existing expense (amount, date, reason)
   └─ NO → Create new Expense record
   ↓
6. Expense record appears in Income/Expense module
```

### Code Example

```python
# In router/salary.py - create_allowance()
new_allowance = Allowance(
    teacher_id=allowance_data.teacher_id,
    month=allowance_data.month,
    year=allowance_data.year,
    amount=allowance_data.amount,
    reason=allowance_data.reason
)
db.add(new_allowance)
db.commit()
db.refresh(new_allowance)

# Recalculate ledger after allowance
recalculate_ledger_totals(db, allowance_data.teacher_id, ...)

# AUTO-SYNC: Sync to expense record
try:
    sync_expense_for_allowance(db, new_allowance, teacher.teacher_name)
    linked_expense_created = True
except Exception as sync_error:
    print(f"Warning: Failed to sync expense for allowance: {str(sync_error)}")
```

### Created Expense Record

```python
Expense(
    recipt_number=None,
    date=allowance.created_at,           # Allowance creation date
    category_id=<Allowance Category ID>, # "الاؤنس" (Allowance)
    to_whom=teacher_name,                # Teacher name
    description="Auto-generated from Allowance ID 5 (Travel Allowance)",
    amount=allowance.amount,             # Allowance amount
    source_type="allowance",             # Links back to allowance
    source_id=allowance.id,              # Links back to allowance ID
    created_at=datetime.utcnow()
)
```

---

## Flow 3: Paid Fee → Income

### Code Location
- **Service**: [services/finance_sync_service.py](services/finance_sync_service.py#L67-L152)
- **Router**: [router/fee.py](router/fee.py#L106-L155)

### Workflow

```
1. Admin marks Fee as "Paid" (fee_status = "Paid")
   ↓
2. Creates Fee record with fee_status = Paid
   ↓
3. Checks: if fee_status == PAID?
   ├─ NO → Only create fee, no income sync
   └─ YES → Automatically calls sync_income_for_fee()
   ↓
4. Function checks: Does income with source_type="fee" 
   and source_id=fee.fee_id already exist?
   ├─ YES → Update existing income (amount, date, student info)
   └─ NO → Create new Income record
   ↓
5. Income record automatically appears in Income/Expense module
```

### Code Example

```python
# In router/fee.py - create_fee()
new_fee = Fee(
    student_id=fee_data.student_id,
    class_id=fee_data.class_id,
    fee_amount=fee_data.fee_amount,
    fee_month=fee_data.fee_month,
    fee_year=fee_data.fee_year,
    fee_status=FeeStatus.PAID  # Or "Paid"
)
db.add(new_fee)
db.commit()
db.refresh(new_fee)

# AUTO-SYNC: Only if fee is marked as PAID
if new_fee.fee_status == FeeStatus.PAID or new_fee.fee_status == "Paid":
    try:
        sync_income_for_fee(
            db, new_fee, 
            student.student_name, 
            student.father_name, 
            class_name.class_name
        )
        linked_income_created = True
    except Exception as sync_error:
        print(f"Warning: Failed to sync income for fee: {str(sync_error)}")
```

### Created Income Record

```python
Income(
    recipt_number=None,
    date=fee.created_at,                    # Fee creation date
    category_id=<Fee Income Category ID>,   # "ماہانہ فیس" (Monthly Fee)
    source="Ali Khan (Father Name) - Class 5-A",  # Student details
    description="Auto-generated from Fee ID 123",
    contact=None,
    amount=fee.fee_amount,                  # Fee amount
    source_type="fee",                      # Links back to fee
    source_id=fee.fee_id,                   # Links back to fee ID
    created_at=datetime.utcnow()
)
```

---

## Category Names (Required)

For auto-sync to work, these categories **must exist** in the database:

| Module | Category Name (Urdu) | Purpose |
|--------|----------------------|---------|
| Income | ماہانہ فیس (Monthly Fee) | Auto-generated from paid fees |
| Expense | تنخواہ (Salary) | Auto-generated from salary payments |
| Expense | الاؤنس (Allowance) | Auto-generated from allowances |

**Location**: Defined in [services/finance_sync_service.py](services/finance_sync_service.py#L22-L26)

---

## Protection Mechanisms

### 1. Prevent Deletion of Auto-Generated Records

Users **cannot** delete auto-generated Income/Expense records directly:

```python
# In router/income.py
if db_income.source_type is not None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Cannot delete auto-generated income record from {db_income.source_type}. 
                 Delete the source record instead."
    )
```

**User must delete the Fee/Salary/Allowance instead**, which automatically deletes linked expense/income.

### 2. Update Synchronization

When a source record is updated, the linked income/expense is **automatically updated**:

```python
# Example: When salary payment amount changes
existing_expense.amount = float(payment.amount)  # Auto-update
existing_expense.date = payment.payment_date     # Auto-update
existing_expense.to_whom = teacher_name         # Auto-update
```

### 3. One-to-One Linkage

The `source_type` + `source_id` combination ensures **only one** expense/income per transaction:

```python
# Check for existing record before creating new one
existing_expense = db.exec(
    select(Expense).where(
        Expense.source_type == "salary_payment",
        Expense.source_id == payment.id  # Unique pair
    )
).first()

if existing_expense:
    # Update existing instead of creating duplicate
    existing_expense.amount = float(payment.amount)
    db.add(existing_expense)
else:
    # Create new only if doesn't exist
    db.add(new_expense)
```

---

## Data Integrity Rules

| Action | Result |
|--------|--------|
| Create Salary Payment | → Auto-create Expense |
| Update Salary Payment | → Auto-update linked Expense |
| Delete Salary Payment | → Auto-delete linked Expense |
| Create Allowance | → Auto-create Expense |
| Update Allowance | → Auto-update linked Expense |
| Delete Allowance | → Auto-delete linked Expense |
| Mark Fee as "Paid" | → Auto-create Income |
| Mark Fee as "Unpaid" | → Auto-delete linked Income |
| Update Paid Fee Amount | → Auto-update linked Income |
| Delete Fee | → Auto-delete linked Income |

---

## API Response Fields

All endpoints now return a `linked_*_created` flag:

```json
{
  "id": 42,
  "teacher_id": 5,
  "amount": 50000,
  "payment_date": "2024-09-01",
  "linked_expense_created": true,  // ← Indicates sync success
  "created_at": "2024-09-01T10:30:00"
}
```

---

## Error Handling

If synchronization fails:
- **Payroll operation succeeds** (Salary/Allowance/Fee is created/updated)
- **Sync error is logged** as a warning
- **User is NOT blocked** from the main operation
- **Manual fix available**: Admin can view logs and manually adjust if needed

```python
try:
    sync_expense_for_salary_payment(db, new_payment, teacher.teacher_name)
    linked_expense_created = True
except Exception as sync_error:
    # Log warning but don't fail the payment creation
    print(f"Warning: Failed to sync expense: {str(sync_error)}")
    linked_expense_created = False
```

---

## Summary

| Aspect | Details |
|--------|---------|
| **Service File** | `services/finance_sync_service.py` |
| **Database Fields** | `source_type`, `source_id` on Income/Expense tables |
| **Sync Triggers** | Creating/Updating Salary, Allowance, Paid Fees |
| **Automation** | Happens in the router layer, right after DB commit |
| **Rollback Protection** | Source deletion removes linked income/expense |
| **Error Resilience** | Logs warnings but doesn't fail main operation |
| **Category Requirement** | Three Urdu category names must exist for auto-sync |

The system maintains **accounting accuracy** by automatically syncing payroll transactions to financial records, eliminating manual data entry errors.
