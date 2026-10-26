import time
from collections import defaultdict, deque
from collections.abc import Callable


class RateLimiter:
    """At most `limit` hits per key in any `window` seconds. In memory, so per process; fine for one instance."""

    def __init__(self, limit: int, window: float, clock: Callable[[], float] = time.monotonic):
        self.limit, self.window, self.clock = limit, window, clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str) -> bool:
        """Record an attempt for `key`. Returns False (and records nothing) when the key is over the limit."""
        now = self.clock()
        hits = self._hits[key]
        while hits and hits[0] <= now - self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


ip_limiter = RateLimiter(limit=30, window=15 * 60)
email_limiter = RateLimiter(limit=10, window=15 * 60)
# Reset emails per address, so the forgot-password form can't flood an inbox or use up Brevo's daily quota.
reset_send_limiter = RateLimiter(limit=3, window=60 * 60)
