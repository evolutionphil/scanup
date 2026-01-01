"""
Email Service using Resend
Handles all transactional emails for ScanUp
"""
import os
import resend
from typing import Optional
import logging
import secrets
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.getenv("RESEND_API_KEY")

# Email configuration
FROM_EMAIL = "ScanUp <onboarding@resend.dev>"  # Use your verified domain later
APP_NAME = "ScanUp"
APP_URL = "https://scanup.app"  # Update with your actual app URL

# Email Templates
def get_welcome_email_html(user_name: str) -> str:
    """Welcome email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {APP_NAME}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📄 {APP_NAME}</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome, {user_name}! 🎉</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Thank you for joining {APP_NAME}! We're excited to have you on board.
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    With {APP_NAME}, you can:
                                </p>
                                <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                                    <li>📸 Scan documents instantly with your camera</li>
                                    <li>📝 Extract text from images with OCR</li>
                                    <li>📁 Organize documents into folders</li>
                                    <li>🔒 Protect PDFs with passwords</li>
                                    <li>☁️ Sync across all your devices</li>
                                </ul>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Start scanning your first document now!
                                </p>
                                <div style="text-align: center;">
                                    <a href="{APP_URL}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Open {APP_NAME}</a>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                    © 2025 {APP_NAME}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_verification_email_html(user_name: str, verification_code: str) -> str:
    """Email verification template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📄 {APP_NAME}</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email ✉️</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi {user_name},
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Please use the following code to verify your email address:
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <div style="display: inline-block; background-color: #f3f4f6; border: 2px dashed #3B82F6; border-radius: 12px; padding: 20px 40px;">
                                        <span style="font-size: 32px; font-weight: 700; color: #3B82F6; letter-spacing: 8px;">{verification_code}</span>
                                    </div>
                                </div>
                                <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                                    This code expires in 24 hours. If you didn't create an account, you can ignore this email.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                    © 2025 {APP_NAME}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_password_reset_email_html(user_name: str, reset_code: str) -> str:
    """Password reset email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); padding: 40px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📄 {APP_NAME}</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password 🔑</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi {user_name},
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    We received a request to reset your password. Use the code below to reset it:
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <div style="display: inline-block; background-color: #fef3c7; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px 40px;">
                                        <span style="font-size: 32px; font-weight: 700; color: #d97706; letter-spacing: 8px;">{reset_code}</span>
                                    </div>
                                </div>
                                <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                                    This code expires in 1 hour. If you didn't request this, please ignore this email.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                    © 2025 {APP_NAME}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_purchase_confirmation_email_html(user_name: str, product_name: str, price: str) -> str:
    """Purchase confirmation email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Thank You!</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Purchase Confirmed ✅</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi {user_name},
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Thank you for your purchase! Your support helps us continue improving {APP_NAME}.
                                </p>
                                <!-- Order Details -->
                                <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin: 20px 0;">
                                    <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">Order Details</h3>
                                    <table width="100%" style="border-collapse: collapse;">
                                        <tr>
                                            <td style="color: #6b7280; padding: 8px 0; font-size: 14px;">Product</td>
                                            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">{product_name}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #6b7280; padding: 8px 0; font-size: 14px; border-top: 1px solid #e5e7eb;">Amount</td>
                                            <td style="color: #10b981; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600; border-top: 1px solid #e5e7eb;">{price}</td>
                                        </tr>
                                        <tr>
                                            <td style="color: #6b7280; padding: 8px 0; font-size: 14px; border-top: 1px solid #e5e7eb;">Date</td>
                                            <td style="color: #1f2937; padding: 8px 0; font-size: 14px; text-align: right; border-top: 1px solid #e5e7eb;">{datetime.now().strftime('%B %d, %Y')}</td>
                                        </tr>
                                    </table>
                                </div>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                                    Your premium features are now active. Enjoy ad-free scanning with all premium filters!
                                </p>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="{APP_URL}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Start Using Premium</a>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                    © 2025 {APP_NAME}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def get_premium_welcome_email_html(user_name: str, plan_name: str) -> str:
    """Premium welcome email template"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Premium</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">⭐ Welcome to Premium!</h1>
                            </td>
                        </tr>
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">You're Now a Premium Member! 🎊</h2>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                    Hi {user_name},
                                </p>
                                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                    Welcome to {APP_NAME} <strong>{plan_name}</strong>! You now have access to all our premium features:
                                </p>
                                <ul style="color: #4b5563; font-size: 16px; line-height: 2; margin: 0 0 30px 0; padding-left: 20px;">
                                    <li>🚫 <strong>No Ads</strong> - Enjoy an ad-free experience</li>
                                    <li>💧 <strong>No Watermarks</strong> - Clean exports without branding</li>
                                    <li>♾️ <strong>Unlimited Scans</strong> - Scan as many documents as you need</li>
                                    <li>☁️ <strong>10 GB Cloud Storage</strong> - Store all your documents securely</li>
                                    <li>📝 <strong>Unlimited OCR</strong> - Extract text from any image</li>
                                    <li>🔒 <strong>PDF Password Protection</strong> - Secure your sensitive documents</li>
                                    <li>🎨 <strong>Premium Filters</strong> - Access all document enhancement filters</li>
                                    <li>✍️ <strong>Unlimited Signatures</strong> - Sign documents without limits</li>
                                    <li>🎧 <strong>Priority Support</strong> - Get help faster when you need it</li>
                                </ul>
                                <div style="text-align: center; margin-top: 30px;">
                                    <a href="{APP_URL}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">Explore Premium Features</a>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                                    © 2025 {APP_NAME}. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


# Email sending functions
async def send_welcome_email(to_email: str, user_name: str) -> bool:
    """Send welcome email to new user"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured")
            return False
            
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Welcome to {APP_NAME}! 🎉",
            "html": get_welcome_email_html(user_name),
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Welcome email sent to {to_email}: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        return False


async def send_verification_email(to_email: str, user_name: str, verification_code: str) -> bool:
    """Send email verification code"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured")
            return False
            
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Verify your {APP_NAME} account",
            "html": get_verification_email_html(user_name, verification_code),
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Verification email sent to {to_email}: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {to_email}: {e}")
        return False


async def send_password_reset_email(to_email: str, user_name: str, reset_code: str) -> bool:
    """Send password reset code"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured")
            return False
            
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Reset your {APP_NAME} password",
            "html": get_password_reset_email_html(user_name, reset_code),
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Password reset email sent to {to_email}: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False


async def send_purchase_confirmation_email(to_email: str, user_name: str, product_name: str, price: str) -> bool:
    """Send purchase confirmation email"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured")
            return False
            
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Thank you for your {APP_NAME} purchase! 🎉",
            "html": get_purchase_confirmation_email_html(user_name, product_name, price),
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Purchase confirmation email sent to {to_email}: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send purchase confirmation email to {to_email}: {e}")
        return False


async def send_premium_welcome_email(to_email: str, user_name: str, plan_name: str) -> bool:
    """Send premium welcome email"""
    try:
        if not resend.api_key:
            logger.warning("Resend API key not configured")
            return False
            
        params = {
            "from": FROM_EMAIL,
            "to": [to_email],
            "subject": f"Welcome to {APP_NAME} Premium! ⭐",
            "html": get_premium_welcome_email_html(user_name, plan_name),
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Premium welcome email sent to {to_email}: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send premium welcome email to {to_email}: {e}")
        return False


def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])


def generate_reset_code() -> str:
    """Generate a 6-digit reset code"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
