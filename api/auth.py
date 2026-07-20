from datetime import datetime, timedelta
from typing import Optional
import os
import hmac
import base64
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import hashlib
import os as pyos
from pydantic import BaseModel

from db import get_db, User

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-key-for-dev")
SALT = pyos.environ.get("PWD_SALT", "static-salt-for-demo-purposes").encode()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# ─── Pydantic Models ─────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    api_credit_limit: int
    credits_used: int
    
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    role: str
    api_credit_limit: int

# ─── Helper Functions ────────────────────────────────────────────────────────
def get_password_hash(password: str) -> str:
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), SALT, 100000)
    return key.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": int(expire.timestamp())})
    
    # Create standard JWT using only built-in libraries
    header = base64.urlsafe_b64encode(json.dumps({"alg": ALGORITHM, "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps(to_encode).encode()).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
    return f"{header}.{payload}.{signature}"

def decode_token(token: str):
    try:
        parts = token.split(".")
        if len(parts) != 3: return None
        header, payload, signature = parts
        
        # Verify signature
        expected_sig = base64.urlsafe_b64encode(hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        # Add padding back if needed
        payload += "=" * ((4 - len(payload) % 4) % 4)
        decoded = json.loads(base64.urlsafe_b64decode(payload).decode())
        if decoded.get("exp", 0) < int(datetime.utcnow().timestamp()):
            return None
        return decoded
    except Exception:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
        
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# ─── Endpoints ───────────────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        # First user is automatically admin, others are user
        is_first_user = db.query(User).count() == 0
        role = "admin" if is_first_user else "user"
        
        hashed_password = get_password_hash(user.password)
        new_user = User(
            email=user.email,
            hashed_password=hashed_password,
            role=role,
            api_credit_limit=50 if role == "user" else 99999
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e) + "\n" + traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}")

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.email == form_data.username).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email, "role": user.role}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e) + "\n" + traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {error_msg}")

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ─── Admin Endpoints ─────────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserResponse])
def get_all_users(admin: User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    return db.query(User).all()

@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(user_id: int, update_data: UserUpdate, admin: User = Depends(get_current_active_admin), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.role = update_data.role
    user.api_credit_limit = update_data.api_credit_limit
    db.commit()
    db.refresh(user)
    return user
