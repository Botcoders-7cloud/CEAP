"""
CEAP — Audit Log Service
Logs important actions to the AuditLog table for accountability.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.tenant import AuditLog


async def log_action(
    db: AsyncSession,
    *,
    user_id: str | None = None,
    tenant_id: str,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
):
    """
    Write an audit log entry.

    Args:
        action: e.g. "user.created", "event.published", "exam.submitted"
        entity_type: e.g. "user", "event", "certificate"
        entity_id: ID of the affected entity
        old_values: JSON dict of previous state
        new_values: JSON dict of new state
        ip_address: client IP (optional)
    """
    entry = AuditLog(
        user_id=user_id,
        tenant_id=tenant_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
    )
    db.add(entry)
