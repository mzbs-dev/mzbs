# Authentication & Authorization Security Review

**Project:** MMS-GENERAL  
**Date Reviewed:** March 27, 2026  
**Status:** Multiple security improvements needed

---

## Executive Summary

Your application uses JWT-based authentication with role-based access control (RBAC). While the foundation is solid, there are **critical security gaps** that need immediate attention, particularly around token storage, CORS configuration, and password policies. This review identifies 12 issues ranging from critical to minor.

---

## 1. CRITICAL ISSUES 🔴

### 1.1 Token Storage in localStorage (CRITICAL)
**Location:** [frontend/src/components/Login.tsx](frontend/src/components/Login.tsx#L42-L44)  
**Severity:** CRITICAL

```typescript
localStorage.setItem("access_token", response.access_token)
localStorage.setItem("user", JSON.stringify(response.user))
```

**Problem:**
- localStorage is vulnerable to XSS attacks
- Tokens stored here are accessible via JavaScript without HTTPOnly protection
- No protection against XSS payload injection

**Recommendation:**
- ✅ Use **HTTPOnly cookies** for tokens (server should set them, not client)
- ✅ Use **Secure** flag (HTTPS only)
- ✅ Use **SameSite=Strict** to prevent CSRF

**Fix Example:**
```python
# Backend should set this, not user saving to localStorage
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,      # Blocks JavaScript access
    secure=True,        # HTTPS only
    samesite="strict",  # CSRF protection
    max_age=900         # 15 minutes
)
```

---

### 1.2 Overly Permissive CORS Configuration
**Location:** [main.py](main.py#L86-L91)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],     # ⚠️ CRITICAL
    allow_headers=["*"],     # ⚠️ CRITICAL
    expose_headers=["*"]     # ⚠️ CRITICAL
)
```

**Problems:**
1. Allow all HTTP methods (GET, POST, DELETE, PATCH, etc.)
2. Allow all headers - opens door to header injection
3. `expose_headers=["*"]` exposes all response headers
4. Only 2 origins but using wildcard patterns could be risky

**Recommendation:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://mzbs.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Specific methods
    allow_headers=["Content-Type", "Authorization"],  # Specific headers
    expose_headers=["Content-Type"],
    max_age=3600
)
```

---

### 1.3 Missing Password Requirements
**Location:** [user/user_models.py](user/user_models.py#L27)

**Problem:**
- No password validation on `UserCreate` or `UserLogin` models
- Users can set weak passwords like "123" or "password"
- No minimum length, complexity, or special character requirements

**Recommendation:**
```python
from pydantic import field_validator, Field

class UserCreate(SQLModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=12)
    
    @field_validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        if not any(c in '!@#$%^&*()_+-=[]{}|;:' for c in v):
            raise ValueError('Password must contain special character')
        return v
```

---

## 2. HIGH SEVERITY ISSUES 🟠

### 2.1 Token Expiration Not Validated During Logout
**Location:** [frontend/src/api/axiosInterceptorInstance.ts](frontend/src/api/axiosInterceptorInstance.ts#L33-L44)

**Problem:**
- Refresh token endpoint is hardcoded but not defined in backend routers
- No token revocation on logout
- Client-side logout only clears localStorage, doesn't invalidate server tokens

**Current Code:**
```typescript
try {
    const response = await axios.post("/auth/refresh");  // ⚠️ Endpoint missing?
```

**Recommendation:**
1. Implement refresh token revocation in database
2. Store refresh tokens in DB with revocation tracking
3. Clear all tokens on logout

```python
# In services.py - Fix the incomplete implementation
def revoke_refresh_token(db: Session, token: str):
    """Revokes a refresh token (used for logout)."""
    stored_token = db.exec(
        select(RefreshToken).where(RefreshToken.token == token)
    ).first()
    if stored_token:
        db.delete(stored_token)
        db.commit()
```

---

### 2.2 No HTTPS Enforcement
**Location:** [frontend/src/api/axiosInterceptorInstance.ts](frontend/src/api/axiosInterceptorInstance.ts#L2-L6)

```typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"  // ⚠️ HTTP!
```

**Problem:**
- Tokens sent over plain HTTP in production
- No automatic HTTPS redirect
- Vulnerable to MITM attacks

**Recommendation:**
```typescript
// Enforce HTTPS
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
if (typeof window !== 'undefined' && 
    !apiUrl.startsWith('http://localhost') && 
    !apiUrl.startsWith('https://')) {
    console.error('API URL must use HTTPS');
}

const axiosInterceptorInstance = axios.create({
    baseURL: apiUrl,
    withCredentials: true,  // Include cookies in requests
});
```

---

### 2.3 No Rate Limiting on Login/Token Refresh
**Location:** [user/user_router.py](user/user_router.py)

**Problem:**
- Brute force attack possible on login endpoint
- No throttling on token refresh attempts
- No account lockout after failed attempts

**Recommendation:**
```bash
pip install slowapi
```

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@public_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # 5 attempts per minute
async def login_for_frontend(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    # Implementation
```

---

### 2.4 SQL Injection Risk in Some Queries
**Location:** [user/services.py](user/services.py#L48-L55)

**Problem:**
- While most queries use SQLModel (safe), some patterns could be vulnerable
- Need consistent parameterized query usage

**Recommendation:**
Ensure all database queries use SQLModel/SQLAlchemy safely:
```python
# ✅ SAFE - Using SQLModel
user = db.exec(select(User).where(User.username == username)).first()

# ❌ AVOID - Never do string concatenation
query = f"SELECT * FROM users WHERE username = '{username}'"
```

---

## 3. MEDIUM SEVERITY ISSUES 🟡

### 3.1 Incomplete Authorization Checks
**Location:** Various router files

**Problem:**
- Some endpoints have authorization, others don't
- Gaps in endpoint protection:
  - Student operations require `require_admin_principal()` ✅
  - But some dashboard endpoints may not be protected

**Recommendation:**
Audit all endpoints. Create a checklist:
```
ENDPOINT                           AUTHORIZED    REQUIRED_ROLE
POST   /login                      ❌ None      public
POST   /signup                     ❌ None      public
GET    /auth/me                    ✅ Yes       authenticated
POST   /admin/add_user             ✅ Yes       ADMIN
POST   /students                   ✅ Yes       ADMIN, PRINCIPAL
GET    /dashboard/...              ✅ Yes       ADMIN
```

---

### 3.2 RefreshToken Model Not Found
**Location:** [user/services.py](user/services.py#L160-L176)

**Problem:**
```python
stored_token = db.exec(select(RefreshToken).where(...)).first()  # ❌ Not defined!
```

The `RefreshToken` model is referenced but not defined in `user/user_models.py`

**Recommendation:**
Add to [user/user_models.py](user/user_models.py):
```python
from datetime import datetime

class RefreshToken(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id")
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 3.3 No Audit Logging
**Location:** Entire project

**Problem:**
- No record of who accessed what, when
- No failed login attempts logged
- Can't detect suspicious activity

**Recommendation:**
```python
# Add to user/services.py
from datetime import datetime
from utils.logging import logger

def log_login_attempt(username: str, success: bool, ip_address: str):
    status = "SUCCESS" if success else "FAILED"
    logger.info(f"Login attempt [{status}] - User: {username}, IP: {ip_address}")

def log_authorization_failure(user_id: int, action: str, required_role: str):
    logger.warning(
        f"Authorization denied - User: {user_id}, Action: {action}, "
        f"Required: {required_role}"
    )
```

---

### 3.4 No Token Blacklist for Revocation
**Location:** [user/services.py](user/services.py#L193-L199)

**Problem:**
- Token revocation incomplete
- No blacklist to check revoked tokens
- User could use old token after logout

**Recommendation:**
```python
from redis import Redis

redis_client = Redis(host='localhost', port=6379)

def revoke_token(token: str):
    """Add token to blacklist"""
    redis_client.setex(
        f"blacklist:{token}",
        value="revoked",
        time=900  # 15 minutes (token expiry)
    )

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Check if token is blacklisted
    if redis_client.exists(f"blacklist:{token}"):
        raise HTTPException(status_code=401, detail="Token revoked")
    # Continue with validation
```

---

## 4. LOW SEVERITY ISSUES 🟢

### 4.1 Missing User Consent/Privacy Validation
**Location:** [user/user_models.py](user/user_models.py)

**Recommendation:**
- Add GDPR compliance fields
- Track user consent for data processing

```python
class User(UserBase, table=True):
    # ... existing fields
    gdpr_consent: bool = Field(default=False)
    terms_accepted: bool = Field(default=False)
    privacy_policy_version: str = Field(default="1.0")
```

---

### 4.2 Weak Role-Based Access Control Documentation
**Location:** [user/user_models.py](user/user_models.py#L6-L11)

**Recommendation:**
Add clear documentation:
```python
class UserRole(str, enum.Enum):
    """
    User roles and their permissions:
    - ADMIN: Full system access, can manage users and all resources
    - PRINCIPAL: Can manage teachers, students, attendance, finance
    - TEACHER: Can mark attendance, view student progress
    - ACCOUNTANT: Can manage income/expense categories and records
    - FEE_MANAGER: Can manage fee collection and records
    - USER: Read-only access to own role's data
    """
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    USER = "USER"
    ACCOUNTANT = "ACCOUNTANT"
    FEE_MANAGER = "FEE_MANAGER"
    PRINCIPAL = "PRINCIPAL"
```

---

### 4.3 No Account Deactivation/Soft Delete
**Location:** [user/user_models.py](user/user_models.py)

**Recommendation:**
```python
class User(UserBase, table=True):
    # ... existing fields
    is_active: bool = Field(default=True)
    deactivated_at: Optional[datetime] = None
    
    # Only return active users
    db.exec(
        select(User)
        .where(User.username == username, User.is_active == True)
    ).first()
```

---

### 4.4 No API Key Authentication for Service-to-Service
**Location:** [main.py](main.py)

**Problem:**
- Only JWT available, no API keys for backend-to-backend calls
- No service-level authentication

**Recommendation:**
```python
class APIKey(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    name: str
    service_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## Implementation Priority

| Priority | Count | Issues |
|----------|-------|--------|
| 🔴 Critical | 3 | Token storage, CORS, Password validation |
| 🟠 High | 4 | Logout handling, HTTPS, Rate limiting, SQL injection |
| 🟡 Medium | 3 | Auth gaps, RefreshToken model, Audit logging |
| 🟢 Low | 4 | Privacy, Documentation, Soft delete, API keys |

---

## Quick Start Fixes

### Phase 1: Critical (Do First) ⏱️ 2-3 hours
1. Implement HTTPOnly cookies for tokens
2. Fix CORS configuration
3. Add password validation

### Phase 2: High (Do Next) ⏱️ 4-5 hours
4. Implement rate limiting on login
5. Add refresh token revocation
6. Enable HTTPS enforcement

### Phase 3: Medium (Do Soon) ⏱️ 3-4 hours
7. Fix RefreshToken model
8. Add audit logging
9. Complete authorization checks

### Phase 4: Low (Do Later) ⏱️ 2-3 hours
10. Add privacy/consent fields
11. Implement soft deletes
12. Add API key support

---

## Security Checklist

- [ ] Tokens stored in HTTPOnly cookies
- [ ] CORS limited to specific origins/methods
- [ ] Password enforces complexity rules
- [ ] Rate limiting on sensitive endpoints
- [ ] Refresh token revocation working
- [ ] HTTPS enforced in production
- [ ] Audit logs for login/authorization
- [ ] All endpoints properly authorized
- [ ] RefreshToken model implemented
- [ ] Token blacklist implemented
- [ ] Account deactivation supported
- [ ] GDPR consent tracked
- [ ] API keys for services (optional)

---

## References

- [OWASP Top 10](https://owasp.org/www-top-10/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [CORS Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

**Next Steps:** Review each issue, prioritize fixes, and implement Phase 1 critical items immediately.
