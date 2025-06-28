from passlib.context import CryptContext
from sqlalchemy.orm import Session
from backend.models import User
from backend.BaseRepository import BaseRepository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthRepository(BaseRepository[User]):
    def __init__(self):
        super().__init__(User)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def authenticate_user(self, db: Session, username: str, password: str):
        user = db.query(User).filter(User.username == username).first()
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user

    def create_user(self, db: Session, username: str, email: str, password: str, full_name: str = None):
        hashed_password = self.get_password_hash(password)
        user = User(username=username, email=email, hashed_password=hashed_password)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
