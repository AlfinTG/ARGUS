from sqlalchemy import Column, String
from app.db.base import Base

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    time = Column(String, nullable=False, index=True)
    actor = Column(String, nullable=False, index=True)
    target = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    rule = Column(String, default="—")
    detail = Column(String, nullable=False)
    correlation = Column(String, nullable=False, index=True)
