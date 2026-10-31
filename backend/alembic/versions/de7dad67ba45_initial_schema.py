"""Initial schema

Revision ID: de7dad67ba45
Revises: 
Create Date: 2026-10-26 23:47:54.628285

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'de7dad67ba45'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('institution_id', sa.String(), nullable=True),
        sa.Column('region', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_role', 'users', ['role'])

    # 2. applications
    op.create_table(
        'applications',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('institution', sa.String(), nullable=False),
        sa.Column('app_type', sa.String(), nullable=False),
        sa.Column('region', sa.String(), nullable=False),
        sa.Column('route', sa.String(), nullable=False),
        sa.Column('stage', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('owner_role', sa.String(), nullable=False),
        sa.Column('due_date', sa.String(), nullable=False),
        sa.Column('age_days', sa.Integer(), server_default='0', nullable=False),
        sa.Column('return_reason', sa.String(), server_default='', nullable=True),
        sa.Column('resume_stage', sa.String(), server_default='', nullable=True),
        sa.Column('updated_at', sa.String(), nullable=False),
    )
    op.create_index('ix_applications_id', 'applications', ['id'])
    op.create_index('ix_applications_stage', 'applications', ['stage'])
    op.create_index('ix_applications_status', 'applications', ['status'])

    # 3. compliance_obligations
    op.create_table(
        'compliance_obligations',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('app_id', sa.String(), nullable=False),
        sa.Column('institution', sa.String(), nullable=False),
        sa.Column('due_date', sa.String(), nullable=False),
        sa.Column('evidence_status', sa.String(), nullable=False),
        sa.Column('verification', sa.String(), nullable=False),
        sa.Column('reviewer_role', sa.String(), nullable=False),
        sa.Column('note', sa.String(), server_default='', nullable=True),
    )
    op.create_index('ix_compliance_obligations_id', 'compliance_obligations', ['id'])
    op.create_index('ix_compliance_obligations_app_id', 'compliance_obligations', ['app_id'])

    # 4. evc_tasks
    op.create_table(
        'evc_tasks',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('app_id', sa.String(), nullable=False),
        sa.Column('institution', sa.String(), nullable=False),
        sa.Column('visit_date', sa.String(), server_default='', nullable=True),
        sa.Column('panel', sa.String(), server_default='', nullable=True),
        sa.Column('report_status', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('coordinator_role', sa.String(), nullable=False),
    )
    op.create_index('ix_evc_tasks_id', 'evc_tasks', ['id'])
    op.create_index('ix_evc_tasks_app_id', 'evc_tasks', ['app_id'])

    # 5. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('institution', sa.String(), nullable=False),
        sa.Column('expiry_date', sa.String(), nullable=False),
        sa.Column('renewal_status', sa.String(), nullable=False),
        sa.Column('review_status', sa.String(), nullable=False),
        sa.Column('owner_role', sa.String(), nullable=False),
    )
    op.create_index('ix_documents_id', 'documents', ['id'])

    # 6. alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('target', sa.String(), nullable=False),
        sa.Column('rule_id', sa.String(), nullable=False),
        sa.Column('message', sa.String(), nullable=False),
        sa.Column('recipient_role', sa.String(), nullable=False),
        sa.Column('created_at', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default='Open', nullable=False),
        sa.Column('processed_key', sa.String(), nullable=True),
    )
    op.create_index('ix_alerts_id', 'alerts', ['id'])
    op.create_index('ix_alerts_target', 'alerts', ['target'])
    op.create_index('ix_alerts_rule_id', 'alerts', ['rule_id'])
    op.create_index('ix_alerts_recipient_role', 'alerts', ['recipient_role'])
    op.create_index('ix_alerts_status', 'alerts', ['status'])
    op.create_index('ix_alerts_processed_key', 'alerts', ['processed_key'], unique=True)

    # 7. audit_events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('time', sa.String(), nullable=False),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('target', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('rule', sa.String(), nullable=False),
        sa.Column('detail', sa.String(), nullable=False),
        sa.Column('correlation', sa.String(), nullable=False),
    )
    op.create_index('ix_audit_events_id', 'audit_events', ['id'])
    op.create_index('ix_audit_events_target', 'audit_events', ['target'])
    op.create_index('ix_audit_events_event_type', 'audit_events', ['event_type'])
    op.create_index('ix_audit_events_correlation', 'audit_events', ['correlation'])

    # 8. rule_configs
    op.create_table(
        'rule_configs',
        sa.Column('id', sa.String(), primary_key=True, server_default='default'),
        sa.Column('reminder_days', sa.Integer(), server_default='7', nullable=False),
        sa.Column('expiry_days', sa.Integer(), server_default='30', nullable=False),
        sa.Column('escalation_role', sa.String(), server_default='Regional Officer', nullable=False),
        sa.Column('policy_version', sa.String(), server_default='DEMO-v1', nullable=False),
        sa.Column('simulation_date', sa.String(), server_default='2026-10-26', nullable=False),
    )

def downgrade() -> None:
    op.drop_table('rule_configs')
    op.drop_table('audit_events')
    op.drop_table('alerts')
    op.drop_table('documents')
    op.drop_table('evc_tasks')
    op.drop_table('compliance_obligations')
    op.drop_table('applications')
    op.drop_table('users')
