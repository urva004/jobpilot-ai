import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import SMTP_EMAIL, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """
    Sends a styled HTML email with a 6-digit OTP.
    purpose: 'verify_email' or 'reset_password'
    """
    # If SMTP_EMAIL or SMTP_PASSWORD is not configured, we print to stdout
    # to facilitate local testing without SMTP configuration.
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print("\n" + "="*60)
        print(f"SMTP NOT CONFIGURABLE - PRINTING OTP TO CONSOLE")
        print(f"To: {to_email}")
        print(f"Purpose: {purpose}")
        print(f"OTP Code: {otp}")
        print("="*60 + "\n")
        return True

    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    if purpose == "verify_email":
        msg["Subject"] = "Verify your JobPilot AI Account"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h2 style="color: #6366f1; text-align: center; margin-bottom: 20px;">Welcome to JobPilot AI!</h2>
                    <p>Thank you for signing up. Please verify your email address to get started.</p>
                    <p>Your 6-digit One-Time Password (OTP) is:</p>
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="font-size: 12px; color: #777;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; text-align: center; color: #999;">JobPilot AI © 2026</p>
                </div>
            </body>
        </html>
        """
    else:
        msg["Subject"] = "Reset your JobPilot AI Password"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <h2 style="color: #6366f1; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
                    <p>We received a request to reset your password. Use the verification code below to proceed.</p>
                    <p>Your 6-digit One-Time Password (OTP) is:</p>
                    <div style="background-color: #f3f4f6; border-radius: 6px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="font-size: 12px; color: #777;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 11px; text-align: center; color: #999;">JobPilot AI © 2026</p>
                </div>
            </body>
        </html>
        """

    msg.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email via SMTP: {e}")
        # Fallback to printing to console to prevent blocking flows
        print("\n" + "="*60)
        print(f"FALLBACK OTP PRINT TO CONSOLE")
        print(f"To: {to_email}")
        print(f"Purpose: {purpose}")
        print(f"OTP Code: {otp}")
        print("="*60 + "\n")
        return False
