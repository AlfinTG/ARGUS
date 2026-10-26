from sqlalchemy import Column, String
from app.db.base import Base

class DocumentRecord(Base):
    __tablename__ = "document_records"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    institution = Column(String, nullable=False)
    expiry_date = Column(String, nullable=False, index=True)
    renewal_status = Column(String, default="Not submitted")
    review_status = Column(String, default="Not reviewed", index=True)
    owner_role = Column(String, nullable=False)
