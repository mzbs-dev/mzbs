# Phase 3 — Remaining Adversarial Tests

Two tests left from the plan's Phase 3, Day 5 checklist. Both build on
what's already confirmed working: explicit `tenant_id` login, `DEFAULT_TENANT_ID`
fallback, and clean 404 on an unknown tenant.

Run these whenever convenient — they don't depend on each other or on
anything else being built first.

---

## Test B — Suspended tenant takes effect immediately

**What this proves:** if a school's account is suspended, anyone still
holding a valid (unexpired) token for that tenant is locked out right away
— no backend restart needed, no grace period.

### Steps

1. Log in normally against `mzbs_staging_school_2` (same as Test 1 earlier)
   and keep the `access_token` from the response.
2. Confirm that token currently works — call any authenticated endpoint
   (e.g. `GET /students/all` or similar) with:
   ```
   Authorization: Bearer <access_token>
   ```
   Expect a normal `200`.
3. In the platform-admin API (Swagger for `mzbs-control-panel`), suspend
   the tenant:
   ```
   PATCH /platform-admin/tenants/mzbs_staging_school_2/status
   Body: {"status": "suspended"}
   ```
4. **Without restarting anything**, immediately retry the exact same
   authenticated request from step 2, using the *same* still-unexpired
   token.

### Expected result

Step 4 should now fail — a `403` with something like
`"School account is not active"`. If it still succeeds, that means
`lookup_tenant_connection`'s in-memory cache (the 5-minute TTL one in
`control_plane_client/tenant_lookup.py`) is serving a stale cached status
instead of re-checking. Worth knowing either way:

- **Fails immediately** → cache invalidation on status change is working
  correctly (`tenant_service.py`'s `update_tenant_status()` calls
  `invalidate_tenant_cache(tenant_id)` — this is the mechanism being
  tested).
- **Still succeeds for a few minutes** → the mzbs-side cache has its own
  TTL and doesn't get proactively invalidated the moment status changes
  in `mzbs-control-panel` (they're separate processes/caches, per the
  `tenant_lookup.py` docstring). If that's the case, note how long it
  actually takes to take effect, and decide whether a shorter TTL or an
  active invalidation call between the two services is worth adding
  later — not urgent for 2 tenants, worth revisiting before real schools
  onboard.

### Cleanup

Reactivate the tenant afterward so it doesn't block later testing:
```
PATCH /platform-admin/tenants/mzbs_staging_school_2/status
Body: {"status": "active"}
```

---

## Test C — Tampered token is rejected

**What this proves:** someone can't take a legitimately-issued token and
hand-edit the `tenant_id` claim to gain access to a different school's
data without the signature becoming invalid.

### Steps

1. Take any valid `access_token` from a previous login (e.g. the
   `mzbs_staging_school_2` one from Test 1).
2. A JWT has three dot-separated parts: `header.payload.signature`.
   Decode just the **payload** (the middle part) from base64url — for
   example in a Python shell:
   ```python
   import base64, json
   token = "<paste the access_token>"
   payload_b64 = token.split(".")[1]
   payload_b64 += "=" * (-len(payload_b64) % 4)  # pad for base64
   payload = json.loads(base64.urlsafe_b64decode(payload_b64))
   print(payload)
   # {'sub': 'admin', 'tenant_id': 'mzbs_staging_school_2', 'exp': ...}
   ```
3. Change `tenant_id` to something else, e.g. `mzbs_staging_school`, and
   re-encode just the payload back to base64url:
   ```python
   payload["tenant_id"] = "mzbs_staging_school"
   new_payload_b64 = base64.urlsafe_b64encode(
       json.dumps(payload).encode()
   ).decode().rstrip("=")
   ```
4. Reassemble a "tampered" token using the **original** header and
   **original** signature, but the **new** payload:
   ```python
   header_b64, _, signature_b64 = token.split(".")
   tampered_token = f"{header_b64}.{new_payload_b64}.{signature_b64}"
   print(tampered_token)
   ```
   (The signature will no longer match, since it was computed over the
   original payload — that mismatch is exactly what should get caught.)
5. Call any authenticated endpoint using this tampered token:
   ```
   Authorization: Bearer <tampered_token>
   ```

### Expected result

A clean `401 Unauthorized` — something like `"Could not validate
credentials"`. This should come from `token_deps.py`'s `get_token_payload()`,
where `jwt.decode(...)` raises `JWTError` because the signature no longer
matches the (altered) payload, and that's caught and turned into a 401.

If this instead succeeds, or 500s, that's a serious problem — it would
mean signature verification isn't actually being enforced, and anyone
could self-assign themselves into any tenant. Given `jose`'s `jwt.decode`
verifies signatures by default, this is expected to pass, but it's worth
confirming directly rather than assuming.

### Cleanup

None needed — this test only reads, never writes anything.

---

## After both pass

Per the plan, that completes Phase 3's Day 5 adversarial-testing bar
(tampered token ✅, missing/malformed claim ✅ already covered by Test 4,
suspended tenant ✅). The one item from Day 5 not covered here is the
**concurrent cross-tenant test** (~20 simultaneous requests as two
different tenants, checking for no data crossover under load) — that one
needs a small script rather than manual Swagger clicks, worth doing as
its own follow-up rather than by hand.
