"""
TTL Cache para FastAPI — substitui @st.cache_data.
Thread-safe, baseado em cachetools.
"""

from cachetools import TTLCache
from threading import Lock

_caches: dict[str, TTLCache] = {}
_locks: dict[str, Lock] = {}


def cached_call(key: str, ttl: int, func, *args, **kwargs):
    """Thread-safe TTL cache para funções de market data."""
    if key not in _caches:
        _caches[key] = TTLCache(maxsize=1, ttl=ttl)
        _locks[key] = Lock()

    cache = _caches[key]
    lock = _locks[key]

    with lock:
        if key in cache:
            return cache[key]
        result = func(*args, **kwargs)
        cache[key] = result
        return result
