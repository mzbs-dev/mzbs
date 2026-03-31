from datetime import datetime
from sqlmodel import Relationship, SQLModel, Field # type: ignore
from typing import List, Optional
from datetime import datetime


# ****************************************************************************************
# income_cat Names


class IncomeCatNamesBase(SQLModel):
    income_cat_name_id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default=datetime.now(), nullable=False)


class IncomeCatNames(IncomeCatNamesBase, table=True):
    income_cat_name: str = Field(index=True, unique=True)

    # Relationship back to Income
    
    incomes: List["Income"] = Relationship(back_populates="category")  # type: ignore # Define relationship


class IncomeCatNamesCreate(SQLModel):
    income_cat_name: str = Field(index=True, unique=True)


class IncomeCatNamesResponse(IncomeCatNamesBase, SQLModel):
    income_cat_name: str
