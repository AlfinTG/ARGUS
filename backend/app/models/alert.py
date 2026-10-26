from sqlalchemy import Column, String
from app.db.base import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    target = Column(String, nullable=False, index=True)
    rule_id = Column(String, nullable=False, index=True)
    message = Column(String, nullable=False)
    recipient_role = Column(String, nullable=False, index=True)
    created_at = Column(String, nullable=False)
    status = Column(String, default="Open", index=True)
    processed_key = Column(String, unique=True, index=True, nullable=True)
