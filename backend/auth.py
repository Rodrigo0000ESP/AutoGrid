from passlib.context import CryptContext
from sqlalchemy.orm import Session
from models import User, UserSubscription
from BaseRepository import BaseRepository

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
        # Verificar si el correo ya existe antes de crear el usuario
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            # No lanzamos excepción aquí, solo devolvemos None
            # La excepción se manejará en el controlador
            return None, "El correo electrónico ya está registrado"
            
        # Verificar si el nombre de usuario ya existe
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            return None, "El nombre de usuario ya está en uso"
            
        # Si no existe, crear el usuario
        hashed_password = self.get_password_hash(password)
        user = User(username=username, email=email, hashed_password=hashed_password)

        try:
            db.add(user)
            db.flush()  # Usar flush para obtener el ID del usuario antes del commit

            # Crear la suscripción del usuario con el plan gratuito por defecto
            subscription = UserSubscription(
                user_id=user.id,
                status='active'  # Estado inicial como activo
            )
            db.add(subscription)

            db.commit()
            db.refresh(user)
            return user, None
        except Exception as e:
            db.rollback()
            return None, "Error al crear el usuario: " + str(e)
