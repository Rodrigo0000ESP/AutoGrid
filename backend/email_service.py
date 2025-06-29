from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr, BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# Email service configuration
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@autogrid.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "AutoGrid"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=True
)

# Initialize mail client
mail = FastMail(conf)

class EmailSchema(BaseModel):
    email: List[EmailStr]
    subject: str
    body: str

async def send_email(email: List[str], subject: str, body: str):
    """
    Generic function to send emails
    """
    message = MessageSchema(
        subject=subject,
        recipients=email,
        body=body,
        subtype="html"
    )
    
    try:
        await mail.send_message(message)
        return True
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return False

async def send_password_reset_email(email: str, username: str, token: str, base_url: str):
    """
    Sends a password reset email
    """
    # URL to reset password
    reset_url = f"{base_url}/auth/reset_password.html?token={token}"
    
    # Email content in HTML
    subject = "AutoGrid - Password Reset"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h1 style="color: #0066cc; margin-bottom: 20px;">Password Reset</h1>
            <p>Hello <strong>{username}</strong>,</p>
            <p>We have received a request to reset your password on AutoGrid.</p>
            <p>To create a new password, click on the following link:</p>
            <p style="margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    Reset my password
                </a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request this change, you can ignore this email and your password will remain the same.</p>
            <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
                Regards,<br>
                The AutoGrid Team
            </p>
        </div>
    </body>
    </html>
    """
    
    return await send_email([email], subject, body)
