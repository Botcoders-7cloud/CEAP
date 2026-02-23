"""
CEAP — Email Service
Transactional emails via Resend SDK.
Falls back to console logging in dev mode.
"""
import os
from app.config import settings


async def _send_email(to: str, subject: str, html: str):
    """Send an email via Resend. Falls back to console logging in dev."""
    api_key = getattr(settings, "RESEND_API_KEY", None)
    from_email = getattr(settings, "FROM_EMAIL", "CEAP <noreply@ceap.dev>")

    if not api_key or settings.APP_ENV == "development":
        print(f"📧 [DEV EMAIL] To: {to}")
        print(f"   Subject: {subject}")
        print(f"   Body length: {len(html)} chars")
        return

    try:
        import resend
        resend.api_key = api_key
        resend.Emails.send({
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        print(f"✅ Email sent to {to}: {subject}")
    except Exception as e:
        print(f"⚠️ Email send failed: {e}")


def _base_template(title: str, body: str) -> str:
    """Wrap body in a styled email template."""
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:32px;">
            <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;margin:0;">CEAP</h1>
            <p style="font-size:13px;color:#666;margin:4px 0 0;">Campus Event & Assessment Platform</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
            <h2 style="font-size:18px;font-weight:600;color:#1a1a2e;margin:0 0 16px;">{title}</h2>
            {body}
        </div>
        <p style="text-align:center;font-size:11px;color:#999;margin-top:24px;">
            This is an automated message from CEAP. Do not reply to this email.
        </p>
    </div>
    """


# ── Password Reset ──────────────────────────────────────────
async def send_password_reset(email: str, name: str, token: str):
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    body = f"""
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        We received a request to reset your password. Click the button below to set a new one:
    </p>
    <div style="text-align:center;margin:28px 0;">
        <a href="{reset_url}" style="background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Reset Password
        </a>
    </div>
    <p style="font-size:12px;color:#888;">
        This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    """
    await _send_email(email, "Reset Your CEAP Password", _base_template("Password Reset", body))


# ── Welcome Email (after CSV import) ────────────────────────
async def send_welcome(email: str, name: str, temp_password: str = None):
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    login_url = f"{frontend_url}/login"

    pwd_section = ""
    if temp_password:
        pwd_section = f"""
        <div style="background:#f8f9fa;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="font-size:12px;color:#666;margin:0 0 4px;">Your temporary password:</p>
            <p style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0;font-family:monospace;">{temp_password}</p>
        </div>
        <p style="font-size:12px;color:#888;">
            You will be asked to change this password on your first login.
        </p>
        """

    body = f"""
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Your account has been created on CEAP. You can now log in and participate in events.
    </p>
    {pwd_section}
    <div style="text-align:center;margin:28px 0;">
        <a href="{login_url}" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            Log In to CEAP
        </a>
    </div>
    """
    await _send_email(email, "Welcome to CEAP!", _base_template("Welcome!", body))


# ── Event Published Notification ─────────────────────────────
async def send_event_published(email: str, name: str, event_title: str, event_type: str):
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    type_label = {
        "coding_contest": "🖥️ Coding Contest",
        "hackathon": "💡 Hackathon",
        "mcq_exam": "📝 MCQ Exam",
        "project": "🚀 Project",
    }.get(event_type, event_type)

    body = f"""
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        A new event has been published:
    </p>
    <div style="background:#f0f4ff;border:1px solid #c7d2fe;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
        <p style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">{event_title}</p>
        <p style="font-size:13px;color:#6366f1;margin:0;">{type_label}</p>
    </div>
    <div style="text-align:center;margin:24px 0;">
        <a href="{frontend_url}/dashboard" style="background:#6366f1;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            View Event
        </a>
    </div>
    """
    await _send_email(email, f"New Event: {event_title}", _base_template("New Event!", body))


# ── Event Reminder ───────────────────────────────────────────
async def send_event_reminder(email: str, name: str, event_title: str, starts_in: str):
    body = f"""
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Reminder: <strong>{event_title}</strong> starts {starts_in}.
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Make sure you're ready! 🚀
    </p>
    """
    await _send_email(email, f"Reminder: {event_title} starts {starts_in}", _base_template("Event Reminder", body))


# ── Results Available ────────────────────────────────────────
async def send_results_available(email: str, name: str, event_title: str, score: float = None, rank: int = None):
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    score_section = ""
    if score is not None:
        score_section = f"""
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
            <p style="font-size:12px;color:#666;margin:0 0 4px;">Your Score</p>
            <p style="font-size:28px;font-weight:700;color:#10b981;margin:0;">{score}</p>
            {"<p style='font-size:12px;color:#666;margin:4px 0 0;'>Rank: #" + str(rank) + "</p>" if rank else ""}
        </div>
        """

    body = f"""
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Hi <strong>{name}</strong>,
    </p>
    <p style="color:#444;font-size:14px;line-height:1.6;">
        Results are available for <strong>{event_title}</strong>!
    </p>
    {score_section}
    <div style="text-align:center;margin:24px 0;">
        <a href="{frontend_url}/dashboard/certificates" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
            View Certificates
        </a>
    </div>
    """
    await _send_email(email, f"Results: {event_title}", _base_template("Results Available!", body))
