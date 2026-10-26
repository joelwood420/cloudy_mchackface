"""Sending email through Brevo's transactional API. Only password reset emails for now."""

import logging
from html import escape

import httpx

from app.config import get_settings

log = logging.getLogger(__name__)

BREVO_URL = "https://api.brevo.com/v3/smtp/email"
SUBJECT = "Reset your Cloudy McHackface password"


def _bodies(link: str) -> tuple[str, str]:
    text = (
        "Someone asked to reset the password for your Cloudy McHackface account.\n\n"
        f"Set a new password here:\n{link}\n\n"
        "The link works once and expires in an hour.\n\n"
        "If you didn't ask for this, ignore this email. Your password stays the same.\n"
    )
    href = escape(link, quote=True)
    html = (
        "<p>Someone asked to reset the password for your Cloudy McHackface account.</p>"
        f'<p><a href="{href}">Set a new password</a></p>'
        "<p>The link works once and expires in an hour.</p>"
        "<p>If you didn't ask for this, ignore this email. Your password stays the same.</p>"
    )
    return text, html


def send_password_reset(to_email: str, link: str) -> None:
    """Email a reset link. Never raises: the user has already had their answer, so failures are only logged."""
    settings = get_settings()
    if not settings.brevo_api_key or not settings.mail_from:
        log.warning("Brevo isn't configured, so no email was sent. Reset link for %s: %s", to_email, link)
        return
    text, html = _bodies(link)
    try:
        response = httpx.post(
            BREVO_URL,
            headers={"api-key": settings.brevo_api_key, "accept": "application/json"},
            json={
                "sender": {"email": settings.mail_from, "name": settings.mail_from_name},
                "to": [{"email": to_email}],
                "subject": SUBJECT,
                "textContent": text,
                "htmlContent": html,
            },
            timeout=10,
        )
    except httpx.HTTPError as e:
        log.warning("Couldn't reach Brevo to send a password reset email: %s", e)
        return
    if response.is_error:
        log.warning("Brevo refused a password reset email (%s): %s", response.status_code, response.text[:500])
