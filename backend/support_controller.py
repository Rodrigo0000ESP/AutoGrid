from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from dotenv import load_dotenv
from email_service import send_email

# Load environment
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

router = APIRouter(prefix="/support", tags=["support"])


class SupportMessage(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str


def build_support_email_html(payload: SupportMessage) -> str:
    return f"""
    <html>
      <body style='font-family: Arial, sans-serif; color: #333; line-height: 1.6;'>
        <div style='max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;'>
          <h2 style='color:#0066cc; margin-top:0;'>New Support Message</h2>
          <p><strong>Name:</strong> {payload.name}</p>
          <p><strong>Email:</strong> {payload.email}</p>
          <p><strong>Subject:</strong> {payload.subject}</p>
          <hr style='border:none;border-top:1px solid #eee;margin:20px 0;' />
          <p style='white-space:pre-wrap'>{payload.message}</p>
        </div>
      </body>
    </html>
    """


@router.post("/contact")
async def contact_support(payload: SupportMessage, background_tasks: BackgroundTasks):
    # Destination address for support
    support_to = os.getenv("SUPPORT_EMAIL") or os.getenv("MAIL_FROM") or "noreply@autogrid.com"
    subject = f"[AutoGrid Support] {payload.subject}"
    body = build_support_email_html(payload)

    # Send asynchronously in background
    background_tasks.add_task(send_email, [support_to], subject, body)

    # Optionally, also send a confirmation copy to the user (disabled by default)
    # background_tasks.add_task(send_email, [payload.email], "We've received your message", "Thank you for contacting AutoGrid. We will get back to you soon.")

    return {"message": "Your message has been received. We'll get back to you soon."}
