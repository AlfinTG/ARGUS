import logging
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.security import get_password_hash
from app.models import (
    User,
    Application,
    ComplianceObligation,
    EVCTask,
    DocumentRecord,
    AuditEvent,
    RuleConfig,
)

logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    # Create all tables in database
    bind = db.get_bind() if db is not None else engine
    Base.metadata.create_all(bind=bind)

    # 1. Seed demo user accounts if empty
    if db.query(User).count() == 0:
        demo_password = get_password_hash("Demo@2026!")
        users = [
            User(
                id="USR-001",
                email="scrutiny@aicte.gov.in",
                hashed_password=demo_password,
                full_name="Rajesh Sharma",
                role="Scrutiny Officer",
                region="West",
            ),
            User(
                id="USR-002",
                email="institution@shivneri.edu.in",
                hashed_password=demo_password,
                full_name="Dr. Sunita Patil",
                role="Institution User",
                institution_id="INST-014",
                region="West",
            ),
            User(
                id="USR-003",
                email="coordinator@aicte.gov.in",
                hashed_password=demo_password,
                full_name="Amitabh Sen",
                role="Committee Coordinator",
                region="Central",
            ),
            User(
                id="USR-004",
                email="regional@aicte.gov.in",
                hashed_password=demo_password,
                full_name="Dr. V. Ramanathan",
                role="Regional Officer",
                region="West",
            ),
            User(
                id="USR-005",
                email="authority@aicte.gov.in",
                hashed_password=demo_password,
                full_name="Member Secretary AICTE",
                role="Competent Authority",
            ),
            User(
                id="USR-006",
                email="operator@aicte.gov.in",
                hashed_password=demo_password,
                full_name="System Administration",
                role="System Operator",
            ),
        ]
        db.add_all(users)
        db.commit()

    # 2. Seed default rule configuration if empty
    if db.query(RuleConfig).count() == 0:
        config = RuleConfig(
            id="default",
            reminder_days=7,
            expiry_days=30,
            escalation_role="Regional Officer",
            policy_version="DEMO-v1",
            simulation_date="2026-10-26",
        )
        db.add(config)
        db.commit()

    # 3. Seed synthetic applications if empty
    if db.query(Application).count() == 0:
        apps = [
            Application(
                id="APP-2026-014",
                institution="Shivneri Institute of Technology",
                app_type="Renewal",
                region="West",
                route="Scrutiny + EVC",
                stage="Initial Scrutiny",
                status="Action required",
                owner_role="Scrutiny Officer",
                due_date="2026-10-25",
                age_days=6,
                return_reason="",
                resume_stage="",
                updated_at="2026-10-26",
            ),
            Application(
                id="APP-2026-019",
                institution="Central Technical College",
                app_type="Extension of Approval",
                region="Central",
                route="Scrutiny only",
                stage="Institution Response",
                status="Awaiting institution",
                owner_role="Institution User",
                due_date="2026-10-28",
                age_days=4,
                return_reason="Provide the missing signed faculty list.",
                resume_stage="Initial Scrutiny",
                updated_at="2026-10-26",
            ),
            Application(
                id="APP-2026-023",
                institution="North Valley Institute",
                app_type="New approval",
                region="North",
                route="EVC + SAC/SHC",
                stage="EVC Scheduling",
                status="Awaiting EVC",
                owner_role="Committee Coordinator",
                due_date="2026-10-29",
                age_days=2,
                return_reason="",
                resume_stage="",
                updated_at="2026-10-26",
            ),
            Application(
                id="APP-2026-031",
                institution="Malwa School of Engineering",
                app_type="Renewal",
                region="West",
                route="Scrutiny + EVC",
                stage="Decision Pending",
                status="Decision pending",
                owner_role="Competent Authority",
                due_date="2026-11-02",
                age_days=3,
                return_reason="",
                resume_stage="",
                updated_at="2026-10-26",
            ),
            Application(
                id="APP-2026-036",
                institution="Saraswati College of Technology",
                app_type="Renewal",
                region="Central",
                route="Scrutiny only",
                stage="Decision Pending",
                status="Decision pending",
                owner_role="Competent Authority",
                due_date="2026-10-30",
                age_days=1,
                return_reason="",
                resume_stage="",
                updated_at="2026-10-26",
            ),
            Application(
                id="APP-2026-041",
                institution="Vindhya Institute of Applied Science",
                app_type="New approval",
                region="South",
                route="Only EVC",
                stage="EVC Scheduling",
                status="Awaiting EVC",
                owner_role="Committee Coordinator",
                due_date="2026-10-27",
                age_days=7,
                return_reason="",
                resume_stage="",
                updated_at="2026-10-26",
            ),
        ]
        db.add_all(apps)
        db.commit()

    # 4. Seed compliance obligations if empty
    if db.query(ComplianceObligation).count() == 0:
        compliance = [
            ComplianceObligation(
                id="CMP-014",
                title="Faculty undertaking",
                app_id="APP-2026-014",
                institution="Shivneri Institute of Technology",
                due_date="2026-10-24",
                evidence_status="Submitted",
                verification="Pending Verification",
                reviewer_role="Regional Officer",
                note="Evidence submitted in demo; reviewer action required.",
            ),
            ComplianceObligation(
                id="CMP-031",
                title="Infrastructure compliance report",
                app_id="APP-2026-031",
                institution="Malwa School of Engineering",
                due_date="2026-10-30",
                evidence_status="Not submitted",
                verification="Not reviewed",
                reviewer_role="Regional Officer",
                note="",
            ),
            ComplianceObligation(
                id="CMP-036",
                title="Safety certificate undertaking",
                app_id="APP-2026-036",
                institution="Saraswati College of Technology",
                due_date="2026-11-04",
                evidence_status="Submitted",
                verification="Verified",
                reviewer_role="Regional Officer",
                note="Reviewed in demo.",
            ),
            ComplianceObligation(
                id="CMP-023",
                title="Library resources undertaking",
                app_id="APP-2026-023",
                institution="North Valley Institute",
                due_date="2026-11-14",
                evidence_status="Not submitted",
                verification="Not reviewed",
                reviewer_role="Regional Officer",
                note="",
            ),
        ]
        db.add_all(compliance)
        db.commit()

    # 5. Seed EVC tasks if empty
    if db.query(EVCTask).count() == 0:
        evcs = [
            EVCTask(
                id="EVC-023",
                app_id="APP-2026-023",
                institution="North Valley Institute",
                visit_date="",
                panel="",
                report_status="Not submitted",
                status="Needs scheduling",
                coordinator_role="Committee Coordinator",
            ),
            EVCTask(
                id="EVC-041",
                app_id="APP-2026-041",
                institution="Vindhya Institute of Applied Science",
                visit_date="",
                panel="",
                report_status="Not submitted",
                status="Needs scheduling",
                coordinator_role="Committee Coordinator",
            ),
        ]
        db.add_all(evcs)
        db.commit()

    # 6. Seed documents if empty
    if db.query(DocumentRecord).count() == 0:
        docs = [
            DocumentRecord(
                id="DOC-001",
                title="Land lease deed",
                institution="Central Technical College",
                expiry_date="2026-11-07",
                renewal_status="Not submitted",
                review_status="Not reviewed",
                owner_role="Institution User",
            ),
            DocumentRecord(
                id="DOC-002",
                title="Fire safety certificate",
                institution="Shivneri Institute of Technology",
                expiry_date="2026-10-20",
                renewal_status="Submitted",
                review_status="Pending Verification",
                owner_role="Regional Officer",
            ),
            DocumentRecord(
                id="DOC-003",
                title="Building stability certificate",
                institution="Malwa School of Engineering",
                expiry_date="2026-12-12",
                renewal_status="Not submitted",
                review_status="Not reviewed",
                owner_role="Institution User",
            ),
            DocumentRecord(
                id="DOC-004",
                title="Society registration document",
                institution="North Valley Institute",
                expiry_date="2027-01-18",
                renewal_status="Verified",
                review_status="Verified",
                owner_role="Regional Officer",
            ),
        ]
        db.add_all(docs)
        db.commit()

    # 7. Seed initial audit trail if empty
    if db.query(AuditEvent).count() == 0:
        audits = [
            AuditEvent(
                id="AUD-001",
                time="2026-10-26 09:50",
                actor="Regional Officer",
                target="APP-2026-014",
                event_type="Workflow",
                rule="—",
                detail="Case assigned to initial scrutiny.",
                correlation="COR-START-014",
            ),
            AuditEvent(
                id="AUD-002",
                time="2026-10-26 10:14",
                actor="Institution User",
                target="CMP-014",
                event_type="Compliance",
                rule="CMP-01",
                detail="Faculty undertaking submitted; verification remains pending.",
                correlation="COR-CMP-014",
            ),
            AuditEvent(
                id="AUD-003",
                time="2026-10-26 10:32",
                actor="System (demo)",
                target="DOC-002",
                event_type="Document",
                rule="DOC-01",
                detail="Seeded document record is expired; evaluate renewal/expiry rules.",
                correlation="COR-DOC-002",
            ),
        ]
        db.add_all(audits)
        db.commit()

    # 8. Seed default rule configuration if empty
    if db.query(RuleConfig).count() == 0:
        default_cfg = RuleConfig(
            id="default",
            reminder_days=7,
            expiry_days=30,
            escalation_role="Regional Officer",
            policy_version="DEMO-v1",
            simulation_date="2026-10-26",
        )
        db.add(default_cfg)
        db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    init_db(db)
    print("Database tables initialized and seeded successfully.")
