# # utils/cache.py
from cachetools import TTLCache
from typing import Any, Optional

# Separate caches per endpoint group.
# Keyed by (tenant_id, ...) internally via cache_get/cache_set below —
# maxsize raised from 1 to 100 since each cache now holds one entry
# PER TENANT, not one entry total. 100 is comfortably above your
# expected 10-50 school scale with room to grow.
# ttl in seconds, unchanged.

_CACHE_NAMES = [
    "class_names",
    "teacher_names",
    "attendance_values",
    "attendance_times",
    "income_cats",
    "expense_cats",
    "role_permissions",
]

CACHES: dict[str, TTLCache] = {
    name: TTLCache(maxsize=100, ttl=600) for name in _CACHE_NAMES
}


def cache_get(name: str, tenant_id: str) -> Optional[Any]:
    """Look up a cached value scoped to one tenant.

    tenant_id is now a required part of the key — every cache in this
    module is shared across all tenants in the same backend process,
    so without tenant_id in the key, one tenant's cached data would be
    served to every other tenant until TTL expiry. This was a real bug
    (confirmed 2026-07-30): the old single-slot maxsize=1 cache meant
    whichever tenant's request populated a cache first silently served
    that same data to every other tenant for up to 10 minutes.
    """
    return CACHES[name].get(tenant_id)


def cache_set(name: str, tenant_id: str, value: Any) -> None:
    """Store a value scoped to one tenant."""
    CACHES[name][tenant_id] = value


def cache_invalidate(name: str, tenant_id: Optional[str] = None) -> None:
    """Invalidate one tenant's cached entry.

    Pass tenant_id explicitly for normal use (e.g. after a permission
    change for that school). Omitting tenant_id clears the ENTIRE cache
    for that name, across every tenant — only use this for admin/ops
    tooling (e.g. a manual cache-flush endpoint), never from a
    single-tenant request path, or you'll evict every other school's
    cache as a side effect of one school's action.
    """
    if tenant_id is None:
        CACHES[name].clear()
    else:
        CACHES[name].pop(tenant_id, None)