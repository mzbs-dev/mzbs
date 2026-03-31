# Authentication & Authorization - Implementation Guide

Quick reference for implementing security fixes.

---

## 1. HTTPOnly Cookie Authentication (CRITICAL)

### Backend Changes

**File: `user/settings.py`** - Add new settings:
```python
# Token configuration
ACCESS_TOKEN_EXPIRE_MINUTES = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int, default=15)
REFRESH_TOKEN_EXPIRE_MINUTES = config("REFRESH_TOKEN_EXPIRE_MINUTES", cast=int, default=10080)

# Cookie security settings
COOKIE_SECURE = config("COOKIE_SECURE", cast=bool, default=True)      # HTTPS only
COOKIE_HTTPONLY = config("COOKIE_HTTPONLY", cast=bool, default=True)  # JS can't access
COOKIE_SAMESITE = config("COOKIE_SAMESITE", cast=str, default="strict")
```

**File: `user/user_router.py`** - Update login endpoint:
```python
from fastapi import Response
from datetime import timedelta

@public_router.post("/login", response_model=LoginResponse)
async def login_for_frontend(
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    """Login endpoint - returns tokens in HTTPOnly cookies"""
    try:
        # Get user and validate credentials
        user = get_user_by_username(db, login_data.username)
        if not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create tokens
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        refresh_token = create_refresh_token(
            user.username,
            expires_delta=timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
        )
        
        # Set refresh token in HTTPOnly cookie
        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=True,
            samesite="strict",
            max_age=REFRESH_TOKEN_EXPIRE_MINUTES * 60
        )
        
        # Return access token to client (keep in memory, not localStorage)
        # Frontend will use it only in memory during session
        return LoginResponse(
            access_token=access_token,  # Client stores in memory variable
            refresh_token=None,          # NOT returned to client
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role
            )
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )
```

### Frontend Changes

**File: `frontend/src/api/axiosInterceptorInstance.ts`**:
```typescript
import axios from "axios";

const axiosInterceptorInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,  // ← Important: Include cookies in requests
});

// Store access token in memory (not localStorage)
let accessToken: string | null = null;

// Export function to set token (from login response)
export function setAccessToken(token: string) {
    accessToken = token;
}

export function getAccessToken() {
    return accessToken;
}

export function clearAccessToken() {
    accessToken = null;
}

// Request interceptor: Add access token to Authorization header
axiosInterceptorInstance.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and refresh token
axiosInterceptorInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Refresh token (included in cookies automatically)
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                
                const newAccessToken = response.data.access_token;
                setAccessToken(newAccessToken);
                
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return axiosInterceptorInstance(originalRequest);
            } catch (refreshError) {
                // Refresh failed - redirect to login
                clearAccessToken();
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInterceptorInstance;
```

**File: `frontend/src/components/Login.tsx`** - Update to use memory storage:
```typescript
import { setAccessToken } from "@/api/axiosInterceptorInstance";

export default function LoginForm() {
    // ... existing code ...
    
    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const response = await LoginAPI(data);
            
            if (response?.access_token) {
                // Store in memory
                setAccessToken(response.access_token);
                
                // OPTIONAL: Store minimal user info (no tokens!)
                if (response.user) {
                    sessionStorage.setItem("user", JSON.stringify(response.user));
                }
                
                toast.success("Login Successfully!");
                router.push("/dashboard");
            } else {
                toast.error("Invalid credentials");
            }
        } catch (error: unknown) {
            const apiError = error as ApiErrorResponse;
            toast.error(apiError.response?.data?.detail || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };
    
    // ... rest of code ...
}
```

---

## 2. CORS Configuration (CRITICAL)

**File: `main.py`** - Fix CORS:
```python
from fastapi.middleware.cors import CORSMiddleware

# Define allowed origins (be specific!)
ALLOWED_ORIGINS = [
    "http://localhost:3000",      # Development
    "https://mzbs.vercel.app",    # Production
]

# Security headers
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE"]  # Specific methods only
ALLOWED_HEADERS = ["Content-Type", "Authorization"]  # Specific headers only

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
    expose_headers=["Content-Type"],  # Only expose necessary headers
    max_age=3600,  # Cache preflight for 1 hour
)
```

---

## 3. Password Validation (CRITICAL)

**File: `user/user_models.py`**:
```python
from pydantic import field_validator, Field

class UserCreate(SQLModel):
    username: str = Field(min_length=3, max_length=50)
    email: str
    password: str = Field(min_length=12, max_length=128)
    role: UserRole = Field(default=UserRole.USER)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError('Username must be alphanumeric')
        return v.lower()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        
        if len(v) < 12:
            errors.append("At least 12 characters")
        
        if not any(c.isupper() for c in v):
            errors.append("At least one uppercase letter")
        
        if not any(c.islower() for c in v):
            errors.append("At least one lowercase letter")
        
        if not any(c.isdigit() for c in v):
            errors.append("At least one digit")
        
        if not any(c in '!@#$%^&*()-_=+[]{}|;:,.<>?' for c in v):
            errors.append("At least one special character")
        
        if errors:
            raise ValueError(f"Password must contain: {', '.join(errors)}")
        
        return v

class UserLogin(SQLModel):
    username: str
    password: str
    grant_type: Optional[str] = "password"
    scope: Optional[str] = ""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
```

---

## 4. Rate Limiting (HIGH)

**Install package:**
```bash
pip install slowapi
```

**File: `user/user_router.py`**:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)

# Add exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many requests. Please try again later."}
    )

# Apply rate limiting to sensitive endpoints
@public_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")  # 5 attempts per minute per IP
async def login_for_frontend(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    # Implementation from section 1 above
    pass

@public_router.post("/signup", response_model=UserResponse)
@limiter.limit("3/hour")  # 3 signups per hour per IP
async def signup(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_session)
):
    # Implementation
    pass

@user_router.post("/refresh")
@limiter.limit("10/minute")  # 10 refresh attempts per minute per IP
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: str = Cookie(None),
    db: Session = Depends(get_session)
):
    # Implementation
    pass
```

---

## 5. Refresh Token Model (HIGH)

**File: `user/user_models.py`** - Add new model:
```python
from datetime import datetime, timedelta

class RefreshToken(SQLModel, table=True):
    """Stores refresh tokens for server-side revocation"""
    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    revoked_at: Optional[datetime] = None
    
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    def is_revoked(self) -> bool:
        return self.revoked_at is not None
```

**File: `user/services.py`** - Update functions:
```python
def create_and_store_refresh_token(
    db: Session,
    user_id: int,
    expires_delta: timedelta = None
) -> str:
    """Create and store refresh token"""
    if expires_delta is None:
        expires_delta = timedelta(minutes=REFRESH_TOKEN_EXPIRE_MINUTES)
    
    expires_at = datetime.utcnow() + expires_delta
    
    # Create JWT token
    refresh_token = create_refresh_token(
        data={"sub": str(user_id)},
        expires_delta=expires_delta
    )
    
    # Store in database for revocation tracking
    token_record = RefreshToken(
        token=refresh_token,
        user_id=user_id,
        expires_at=expires_at
    )
    
    db.add(token_record)
    db.commit()
    
    return refresh_token


def verify_and_get_refresh_token(
    db: Session,
    token: str
) -> User:
    """Verify refresh token and return user"""
    try:
        payload = jwt.decode(
            token,
            JWT_REFRESH_SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Check token in database
        token_record = db.exec(
            select(RefreshToken)
            .where(RefreshToken.token == token)
        ).first()
        
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token not found"
            )
        
        if token_record.is_expired():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )
        
        if token_record.is_revoked():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revoked"
            )
        
        return get_user_by_id(db, int(user_id))
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


def revoke_refresh_token(db: Session, token: str) -> bool:
    """Revoke a refresh token (logout)"""
    token_record = db.exec(
        select(RefreshToken)
        .where(RefreshToken.token == token)
    ).first()
    
    if token_record and not token_record.is_revoked():
        token_record.revoked_at = datetime.utcnow()
        db.add(token_record)
        db.commit()
        return True
    
    return False
```

---

## 6. Audit Logging (MEDIUM)

**File: `user/services.py`** - Add logging functions:
```python
from utils.logging import logger
from datetime import datetime

def log_login_attempt(
    username: str,
    success: bool,
    ip_address: str = None,
    error: str = None
):
    """Log login attempts for security auditing"""
    status = "SUCCESS" if success else "FAILED"
    message = (
        f"[LOGIN {status}] User: {username}, "
        f"IP: {ip_address}, "
        f"Time: {datetime.utcnow().isoformat()}"
    )
    if error:
        message += f", Error: {error}"
    
    if success:
        logger.info(message)
    else:
        logger.warning(message)


def log_authorization_failure(
    user_id: int,
    username: str,
    action: str,
    required_role: str,
    ip_address: str = None
):
    """Log authorization failures"""
    logger.warning(
        f"[AUTHZ DENIED] User: {username} (ID: {user_id}), "
        f"Action: {action}, Required: {required_role}, "
        f"IP: {ip_address}, Time: {datetime.utcnow().isoformat()}"
    )


def log_token_refresh(user_id: int, username: str, ip_address: str = None):
    """Log token refresh"""
    logger.info(
        f"[TOKEN REFRESH] User: {username} (ID: {user_id}), "
        f"IP: {ip_address}, Time: {datetime.utcnow().isoformat()}"
    )


def log_logout(user_id: int, username: str, ip_address: str = None):
    """Log logout"""
    logger.info(
        f"[LOGOUT] User: {username} (ID: {user_id}), "
        f"IP: {ip_address}, Time: {datetime.utcnow().isoformat()}"
    )
```

**File: `user/user_router.py`** - Use logging in endpoints:
```python
from fastapi import Request

@public_router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login_for_frontend(
    request: Request,
    response: Response,
    login_data: UserLogin,
    db: Session = Depends(get_session)
):
    ip_address = request.client.host
    
    try:
        user = get_user_by_username(db, login_data.username)
        if not verify_password(login_data.password, user.password):
            log_login_attempt(
                login_data.username,
                success=False,
                ip_address=ip_address,
                error="Invalid password"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # ... create tokens ...
        
        log_login_attempt(
            user.username,
            success=True,
            ip_address=ip_address
        )
        
        return LoginResponse(...)
        
    except HTTPException as e:
        if e.status_code == 401 and "Incorrect" not in e.detail:
            log_login_attempt(
                login_data.username,
                success=False,
                ip_address=ip_address,
                error=str(e.detail)
            )
        raise
```

---

## 7. Environment Variables Template

**File: `.env.example`**:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/mms_db
TEST_DATABASE_URL=sqlite:///test.db

# JWT Configuration
SECRET_KEY=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_MINUTES=10080

# Security
COOKIE_SECURE=True
COOKIE_HTTPONLY=True
COOKIE_SAMESITE=strict

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://mzbs.vercel.app

# API
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Testing Checklist

```bash
# 1. Test HTTPOnly cookies
# - Check browser DevTools Network tab
# - Confirm refresh_token is in Set-Cookie header with HttpOnly flag
# - Verify JavaScript cannot access it

# 2. Test CORS
curl -H "Origin: http://attacker.com" http://localhost:8000/login
# Should return CORS error

# 3. Test password validation
# Try creating user with weak password - should fail

# 4. Test rate limiting
# Run 6 login attempts in 1 minute - 6th should be blocked

# 5. Test token refresh
# Get access token, wait for expiry, refresh should work once
# Second refresh on same token should fail

# 6. Test token revocation
# Logout, try using old refresh token - should be denied
```

---

## Summary

These implementations address the 4 critical/high severity issues:

1. ✅ **Token Storage** - Moved to HTTPOnly cookies
2. ✅ **CORS** - Locked down to specific origins/methods
3. ✅ **Password Validation** - Added complexity requirements
4. ✅ **Rate Limiting** - Protected sensitive endpoints
5. ✅ **Token Revocation** - Database-backed token tracking

Next: Deploy Phase 2 (HTTPS, audit logging) and Phase 3 (complete coverage).
