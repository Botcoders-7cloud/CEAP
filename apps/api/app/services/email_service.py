"""
CEAP Email Service
Sends transactional emails via Resend.
Falls back to console logging in development.
"""
from app.config import settings


async def send_password_reset(email: str, name: str, token: str):
    """Send a password reset link via email."""
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    subject = "CEAP — Reset Your Password"
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: #1A1D26; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            <span style="color: white; font-weight: bold; font-size: 18px;">C</span>
        </div>
        <h2 style="color: #1A1D26; font-size: 22px; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #5C5F6A; font-size: 14px; line-height: 1.6;">
            Hi {name}, we received a request to reset your password. Click the button below to set a new one.
            This link expires in 1 hour.
        </p>
        <a href="{reset_url}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #1A1D26; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Reset Password
        </a>
        <p style="color: #A0A3AB; font-size: 12px; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email.<br/>
            — CEAP Platform
        </p>
    </div>
    """

    if settings.RESEND_API_KEY and settings.APP_ENV != "development":
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [email],
            "subject": subject,
            "html": html,
        })
        print(f"📧 Password reset email sent to {email}")
    else:
        # Dev mode — log to console
        print(f"📧 [DEV] Password reset email for {email}")
        print(f"🔗 Reset URL: {reset_url}")


async def send_welcome(email: str, name: str, role: str):
    """Send welcome email after registration."""
    subject = "Welcome to CEAP! 🎉"
    html = f"""
    <div style="font-family: 'Inter', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: #1A1D26; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
            <span style="color: white; font-weight: bold; font-size: 18px;">C</span>
        </div>
        <h2 style="color: #1A1D26; font-size: 22px; margin-bottom: 8px;">Welcome, {name}! 👋</h2>
        <p style="color: #5C5F6A; font-size: 14px; line-height: 1.6;">
            Your {role} account has been created on the Campus Event & Assessment Platform.
            {"You can now log in and start participating in events." if role == "student" else "Your account is pending admin approval. You'll be notified once approved."}
        </p>
        <a href="{settings.FRONTEND_URL}/login" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #1A1D26; color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">
            Go to CEAP
        </a>
        <p style="color: #A0A3AB; font-size: 12px;">— CEAP Platform</p>
    </div>
    """

    if settings.RESEND_API_KEY and settings.APP_ENV != "development":
        import resend
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.FROM_EMAIL,
            "to": [email],
            "subject": subject,
            "html": html,
        })
        print(f"📧 Welcome email sent to {email}")
    else:
        print(f"📧 [DEV] Welcome email for {email} ({role})")
