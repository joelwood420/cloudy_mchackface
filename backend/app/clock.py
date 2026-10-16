from datetime import date, datetime
from zoneinfo import ZoneInfo

NZ = ZoneInfo("Pacific/Auckland")


def nz_today(now: datetime | None = None) -> date:
    return (now or datetime.now(NZ)).astimezone(NZ).date()


def today() -> date:
    """FastAPI dependency for today's date in NZ. Tests override it to pin a date."""
    return nz_today()
