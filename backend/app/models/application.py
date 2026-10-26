from sqlalchemy import Column, String, Integer
from app.db.base import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, index=True)
    institution = Column(String, nullable=False, index=True)
    app_type = Column(String, nullable=False)
    region = Column(String, nullable=False, index=True)
    route = Column(String, nullable=False)
    stage = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, index=True)
    owner_role = Column(String, nullable=False)
    due_date = Column(String, nullable=True)
    age_days = Column(Integer, default=1)
    return_reason = Column(String, default="")
    resume_stage = Column(String, default="")
    updated_at = Column(String, nullable=False)
