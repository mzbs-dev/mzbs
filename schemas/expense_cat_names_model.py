from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# Expense_cat Names


class ExpenseCatNamesBase(SQLModel):
    expense_cat_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class ExpenseCatNames(ExpenseCatNamesBase, table=True):
    expense_cat_name: str  # Ensure this attribute exists

    # Relationship back to Expense
    
    expenses: List["Expense"] = Relationship(back_populates="category")  # type: ignore # Define relationship


class ExpenseCatNamesCreate(SQLModel):
    expense_cat_name: str = Field(index=True, unique=True)


class ExpenseCatNamesResponse(ExpenseCatNamesBase):
    expense_cat_name: str
