from datetime import UTC, datetime

from app.clock import nz_today


def test_nz_today_uses_auckland_time():
    # 11:30 UTC on Sunday 18 Oct 2026 is 00:30 Monday 19 Oct in NZ (daylight time, UTC+13).
    assert nz_today(datetime(2026, 10, 18, 11, 30, tzinfo=UTC)).isoformat() == "2026-10-19"
    assert nz_today(datetime(2026, 10, 18, 10, 59, tzinfo=UTC)).isoformat() == "2026-10-18"
