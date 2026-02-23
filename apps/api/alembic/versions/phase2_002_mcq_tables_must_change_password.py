"""add must_change_password + MCQ tables

Revision ID: phase2_002
Revises: phase1_001
Create Date: 2026-02-23
"""
from alembic import op
import sqlalchemy as sa

revision = 'phase2_002'
down_revision = 'phase1_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add must_change_password to users ──
    try:
        op.add_column('users', sa.Column('must_change_password', sa.Boolean(), server_default='false', nullable=True))
    except Exception:
        pass

    # ── Create mcq_questions table ──
    try:
        op.create_table(
            'mcq_questions',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('tenant_id', sa.String(36), sa.ForeignKey('tenants.id'), nullable=False),
            sa.Column('event_id', sa.String(36), sa.ForeignKey('events.id'), nullable=True),
            sa.Column('question_text', sa.Text(), nullable=False),
            sa.Column('option_a', sa.String(500), nullable=False),
            sa.Column('option_b', sa.String(500), nullable=False),
            sa.Column('option_c', sa.String(500), nullable=True),
            sa.Column('option_d', sa.String(500), nullable=True),
            sa.Column('correct_option', sa.String(1), nullable=False),
            sa.Column('explanation', sa.Text(), nullable=True),
            sa.Column('marks', sa.Float(), server_default='1.0'),
            sa.Column('negative_marks', sa.Float(), server_default='0.0'),
            sa.Column('difficulty', sa.String(20), server_default='medium'),
            sa.Column('topic', sa.String(200), nullable=True),
            sa.Column('order_index', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
        )
    except Exception:
        pass

    # ── Create mcq_attempts table ──
    try:
        op.create_table(
            'mcq_attempts',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('event_id', sa.String(36), sa.ForeignKey('events.id'), nullable=False),
            sa.Column('started_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('submitted_at', sa.DateTime(), nullable=True),
            sa.Column('time_limit_minutes', sa.Integer(), nullable=True),
            sa.Column('total_questions', sa.Integer(), server_default='0'),
            sa.Column('attempted', sa.Integer(), server_default='0'),
            sa.Column('correct', sa.Integer(), server_default='0'),
            sa.Column('wrong', sa.Integer(), server_default='0'),
            sa.Column('skipped', sa.Integer(), server_default='0'),
            sa.Column('score', sa.Float(), server_default='0.0'),
            sa.Column('max_score', sa.Float(), server_default='0.0'),
            sa.Column('answers_json', sa.Text(), nullable=True),
            sa.Column('status', sa.String(20), server_default='in_progress'),
            sa.UniqueConstraint('user_id', 'event_id', name='uq_user_event_attempt'),
        )
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_table('mcq_attempts')
    except Exception:
        pass
    try:
        op.drop_table('mcq_questions')
    except Exception:
        pass
    try:
        op.drop_column('users', 'must_change_password')
    except Exception:
        pass
