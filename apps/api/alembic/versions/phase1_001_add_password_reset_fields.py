"""add password_reset fields to users

Revision ID: phase1_001
Revises: (initial)
Create Date: 2026-02-23
"""
from alembic import op
import sqlalchemy as sa

revision = 'phase1_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # These columns may already exist if tables were created by init_db()
    # Using batch mode for SQLite compatibility
    try:
        op.add_column('users', sa.Column('password_reset_token', sa.String(64), nullable=True))
    except Exception:
        pass
    try:
        op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
    except Exception:
        pass


def downgrade() -> None:
    try:
        op.drop_column('users', 'password_reset_expires')
    except Exception:
        pass
    try:
        op.drop_column('users', 'password_reset_token')
    except Exception:
        pass
