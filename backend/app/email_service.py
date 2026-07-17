import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import SMTP_EMAIL, SMTP_PASSWORD, SMTP_HOST, SMTP_PORT, MOCK_EMAIL, RESEND_API_KEY
import builtins

def print(*args, **kwargs):
    kwargs.setdefault('flush', True)
    builtins.print(*args, **kwargs)

def send_otp_email(to_email: str, otp: str, purpose: str) -> bool:
    """
    Sends a styled HTML email with a 6-digit OTP.
    purpose: 'verify_email' or 'reset_password'
    """
    if MOCK_EMAIL:
        print("\n" + "="*60)
        print(f"MOCK_EMAIL ACTIVE - PRINTING OTP TO CONSOLE")
        print(f"To: {to_email}")
        print(f"Purpose: {purpose}")
        print(f"OTP Code: {otp}")
        print("="*60 + "\n")
        return True

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

    subject = msg.get("Subject") or "Verification Code"

    # Try sending via Resend API if configured
    if RESEND_API_KEY:
        print("\n" + "--- RESEND API OTP DISPATCH REQUEST ---")
        print(f"Recipient (To): {to_email}")
        print(f"Subject: {subject}")
        print(f"Purpose: {purpose}")
        print("---------------------------------------")
        
        # Sanity check
        if not to_email or "@" not in to_email:
            print(f"[RESEND ERROR] Invalid recipient email address: '{to_email}'")
            return False
            
        try:
            print("[RESEND] Sending HTTP POST request...")
            headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "from": "JobPilot AI <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            res = requests.post("https://api.resend.com/emails", headers=headers, json=payload, timeout=10)
            if res.status_code in [200, 201, 202]:
                print(f"[RESEND SUCCESS] Email accepted by provider. Response: {res.text}")
                return True
            else:
                print(f"[RESEND ERROR] Code: {res.status_code}, Response: {res.text}")
                print("[RESEND] Falling back to SMTP configuration...")
        except Exception as e:
            print(f"[RESEND ERROR] HTTP request exception: {e}")
            print("[RESEND] Falling back to SMTP configuration...")

    # Detailed logging of the outgoing request
    print("\n" + "--- SMTP OTP DISPATCH REQUEST ---")
    print(f"SMTP Host: {SMTP_HOST}:{SMTP_PORT}")
    print(f"Sender (From): {SMTP_EMAIL}")
    print(f"Recipient (To): {to_email}")
    print(f"Subject: {msg.get('Subject')}")
    print(f"Purpose: {purpose}")
    print(f"OTP Length: {len(otp) if otp else 0}")
    print("---------------------------------")

    # Sanity checks on recipient and sender
    if not to_email or "@" not in to_email:
        print(f"[SMTP ERROR] Invalid recipient email address: '{to_email}'")
        return False

    try:
        print("[SMTP] Connecting to server...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        
        print("[SMTP] Sending EHLO...")
        server.ehlo()
        
        print("[SMTP] Starting TLS...")
        server.starttls()
        server.ehlo()
        
        print("[SMTP] Logging in...")
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        
        print("[SMTP] Sending mail...")
        # sendmail returns a dictionary with one entry for each recipient that was refused.
        # If the email was accepted, it returns an empty dictionary.
        rejected = server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        server.quit()
        
        if rejected:
            print(f"[SMTP WARNING] Email was accepted by server, but some recipients were rejected: {rejected}")
            return False
        else:
            print("[SMTP SUCCESS] Email successfully accepted by provider.")
            return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[SMTP ERROR] Authentication failed. Code: {e.smtp_code}, Error: {e.smtp_error.decode('utf-8') if isinstance(e.smtp_error, bytes) else e.smtp_error}")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        print(f"[SMTP ERROR] All recipients refused: {e.recipients}")
        return False
    except smtplib.SMTPSenderRefused as e:
        print(f"[SMTP ERROR] Sender address refused. Code: {e.smtp_code}, Error: {e.smtp_error.decode('utf-8') if isinstance(e.smtp_error, bytes) else e.smtp_error}")
        return False
    except smtplib.SMTPDataError as e:
        print(f"[SMTP ERROR] Server refused message data. Code: {e.smtp_code}, Error: {e.smtp_error.decode('utf-8') if isinstance(e.smtp_error, bytes) else e.smtp_error}")
        return False
    except smtplib.SMTPConnectError as e:
        print(f"[SMTP ERROR] Connection to server failed. Code: {e.smtp_code}, Error: {e.smtp_error}")
        return False
    except smtplib.SMTPException as e:
        print(f"[SMTP ERROR] General SMTP error occurred: {e}")
        return False
    except Exception as e:
        print(f"[SMTP ERROR] Unexpected exception: {e}")
        # Fallback to printing to console to prevent blocking flows in local dev
        print("\n" + "="*60)
        print(f"FALLBACK OTP PRINT TO CONSOLE")
        print(f"To: {to_email}")
        print(f"Purpose: {purpose}")
        print(f"OTP Code: {otp}")
        print("="*60 + "\n")
        return False

