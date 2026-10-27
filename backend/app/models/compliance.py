from sqlalchemy import Column, String, Integer
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
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String, nullable=True)
    checksum_sha256 = Column(String, nullable=True)
    uploaded_at = Column(String, nullable=True)
