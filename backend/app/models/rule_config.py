from sqlalchemy import Column, String, Integer
from app.db.base import Base

class RuleConfig(Base):
    __tablename__ = "rule_configs"

    id = Column(String, primary_key=True, default="default")
    reminder_days = Column(Integer, default=7)
    expiry_days = Column(Integer, default=30)
    escalation_role = Column(String, default="Regional Officer")
    policy_version = Column(String, default="DEMO-v1")
    simulation_date = Column(String, default="2026-10-26")
