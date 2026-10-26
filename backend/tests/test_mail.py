import logging

import httpx
import pytest

from app import mail
from app.config import get_settings

LINK = "http://localhost:5173/reset-password#token=secret-token"


@pytest.fixture
def brevo(monkeypatch):
    """Brevo configured, with httpx.post recorded instead of sent. Set .response to change the reply."""
    settings = get_settings()
    monkeypatch.setattr(settings, "brevo_api_key", "test-key")
    monkeypatch.setattr(settings, "mail_from", "sender@example.com")
    calls = []

    class Recorder:
        response = httpx.Response(201, json={"messageId": "x"})

    def post(url, **kwargs):
        calls.append((url, kwargs))
        return Recorder.response

    monkeypatch.setattr(mail.httpx, "post", post)
    Recorder.calls = calls
    return Recorder


def test_logs_the_link_when_brevo_is_not_configured(monkeypatch, caplog):
    monkeypatch.setattr(get_settings(), "brevo_api_key", None)
    monkeypatch.setattr(mail.httpx, "post", lambda *a, **k: pytest.fail("should not call Brevo"))
    with caplog.at_level(logging.WARNING, logger="app.mail"):
        mail.send_password_reset("joel@example.com", LINK)
    assert LINK in caplog.text


def test_posts_to_brevo(brevo):
    mail.send_password_reset("joel@example.com", LINK)
    [(url, kwargs)] = brevo.calls
    assert url == mail.BREVO_URL
    assert kwargs["headers"]["api-key"] == "test-key"
    body = kwargs["json"]
    assert body["sender"] == {"email": "sender@example.com", "name": "Cloudy McHackface"}
    assert body["to"] == [{"email": "joel@example.com"}]
    assert body["subject"] == "Reset your Cloudy McHackface password"
    assert LINK in body["textContent"] and LINK in body["htmlContent"]


def test_brevo_failure_is_logged_without_the_link(brevo, caplog):
    brevo.response = httpx.Response(401, json={"code": "unauthorized", "message": "Key not found"})
    with caplog.at_level(logging.WARNING, logger="app.mail"):
        mail.send_password_reset("joel@example.com", LINK)
    assert "401" in caplog.text and "Key not found" in caplog.text
    assert "secret-token" not in caplog.text


def test_network_error_is_logged_not_raised(brevo, monkeypatch, caplog):
    def boom(url, **kwargs):
        raise httpx.ConnectError("no route")

    monkeypatch.setattr(mail.httpx, "post", boom)
    with caplog.at_level(logging.WARNING, logger="app.mail"):
        mail.send_password_reset("joel@example.com", LINK)
    assert "no route" in caplog.text
