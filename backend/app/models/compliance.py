from sqlalchemy import Column, String
from app.db.base import Base

class ComplianceObligation(Base):
    __tablename__ = "compliance_obligations"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    app_id = Column(String, nullable=False, index=True)
    institution = Column(String, nullable=False)
    due_date = Column(String, nullable=True)
    evidence_status = Column(String, default="Not submitted")
    verification = Column(String, default="Not reviewed", index=True)
    reviewer_role = Column(String, nullable=False)
    note = Column(String, default="")
