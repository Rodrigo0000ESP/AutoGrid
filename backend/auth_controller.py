from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.auth import AuthRepository
from backend.BaseRepository import SessionLocal
from backend.models import User 

router = APIRouter(prefix="/auth", tags=["auth"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

from backend.jwt_utils import create_access_token, get_current_user

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    repo = AuthRepository()
    existing = db.query(repo.model).filter(repo.model.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    user = repo.create_user(db, request.username, request.email, request.password)
    token = create_access_token({"sub": user.username, "id": user.id})
    return {"user": user, "token": token}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    repo = AuthRepository()
    user = db.query(repo.model).filter(repo.model.id == current_user["id"]).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    repo = AuthRepository()
    user = repo.authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": user.username, "id": user.id})
    return {"user": user, "token": token}

