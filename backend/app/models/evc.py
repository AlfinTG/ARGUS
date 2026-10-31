from sqlalchemy import Column, String
from app.db.base import Base

class EVCTask(Base):
    __tablename__ = "evc_tasks"

    id = Column(String, primary_key=True, index=True)
    app_id = Column(String, nullable=False, index=True)
    institution = Column(String, nullable=False)
    visit_date = Column(String, default="")
    panel = Column(String, default="")
    report_status = Column(String, default="Not submitted")
    status = Column(String, default="Needs scheduling", index=True)
    coordinator_role = Column(String, default="Committee Coordinator")
