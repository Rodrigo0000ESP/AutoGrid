from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from auth import AuthRepository
from BaseRepository import SessionLocal, get_db
from models import User, PasswordReset, EmailVerification
from email_service import send_password_reset_email, send_email_verification
import secrets
import string   
import os
from datetime import datetime, timedelta
from typing import Optional
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

from jwt_utils import create_access_token, get_current_user

class UserResponse(BaseModel):
    id: int
    username: str
    email: str

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

@router.post("/register")
def register(request: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    repo = AuthRepository()
    # Validate password requirements
    pwd_error = repo.validate_password_requirements(request.password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)
    
    # Crear usuario con el nuevo método que verifica email y username
    user, error_message = repo.create_user(db, request.username, request.email, request.password)
    
    # Si hay un error, lanzar una excepción HTTP con el mensaje
    if error_message:
        raise HTTPException(status_code=400, detail=error_message)

    # Crear token de verificación de email (30 minutos)
    verify_token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    verification = EmailVerification(
        user_id=user.id,
        token=verify_token,
        expires_at=datetime.utcnow() + timedelta(minutes=30)
    )
    db.add(verification)
    db.commit()

    # Enviar correo de verificación
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4321")
    background_tasks.add_task(
        send_email_verification,
        email=user.email,
        username=user.username,
        token=verify_token,
        base_url=frontend_url
    )

    response = {"message": "Registration successful. Please check your email to verify your account."}
    if os.getenv("ENVIRONMENT", "development") == "development":
        response["debug_verify_token"] = verify_token
    return response

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
    identifier = request.username or request.email
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username or email is required")
    user = repo.authenticate_user(db, identifier, request.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    # Enforce email verification
    verified = db.query(EmailVerification).filter(EmailVerification.user_id == user.id, EmailVerification.used == True).first()
    if not verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email before logging in.")
    token = create_access_token({"sub": user.username, "id": user.id})
    return {"user": user, "token": token}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # We don't want to reveal if an email exists or not for security reasons
        # So we return success even if the email doesn't exist
        return {"message": "If your email is registered, you will receive a link to reset your password"}
    
    # Generate a random token
    token = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    
    # Check if there's an existing reset request and update it, or create a new one
    reset_request = db.query(PasswordReset).filter(PasswordReset.user_id == user.id).first()
    if reset_request:
        reset_request.token = token
        reset_request.expires_at = datetime.utcnow() + timedelta(minutes=10)
    else:
        reset_request = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        db.add(reset_request)
    
    db.commit()
    
    # Enviar correo electrónico en segundo plano
    frontend_url = os.getenv("FRONTEND_URL", "chrome-extension://gmfhflhogdfhgegedmffabnejkcapcbj")
    background_tasks.add_task(
        send_password_reset_email,
        email=user.email,
        username=user.username,
        token=token,
        base_url=frontend_url
    )
    
    # Devolver mensaje de éxito y token para desarrollo
    response = {"message": "If your email is registered, you will receive a link to reset your password"}
    
    # Solo en desarrollo, incluir el token para pruebas
    if os.getenv("ENVIRONMENT", "development") == "development":
        response["debug_token"] = token
    
    return response

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    # Find the reset request by token
    reset_request = db.query(PasswordReset).filter(PasswordReset.token == request.token).first()
    
    # Check if token exists and is not expired
    if not reset_request or reset_request.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Get the user
    user = db.query(User).filter(User.id == reset_request.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update the password with validation
    repo = AuthRepository()
    pwd_error = repo.validate_password_requirements(request.new_password)
    if pwd_error:
        raise HTTPException(status_code=400, detail=pwd_error)
    hashed_password = repo.get_password_hash(request.new_password)
    user.hashed_password = hashed_password
    
    # Delete the reset request
    db.delete(reset_request)
    db.commit()
    
    return {"message": "Password updated successfully"}

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    verification = db.query(EmailVerification).filter(EmailVerification.token == token).first()
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    if verification.used:
        return {"message": "Email already verified"}
    if verification.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Verification token has expired")
    verification.used = True
    verification.verified_at = datetime.utcnow()
    db.commit()
    return {"message": "Email verified successfully. You can now sign in."}

