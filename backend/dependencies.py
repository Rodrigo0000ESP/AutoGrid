from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from models import User, Job, UserSubscription
from jwt_utils import get_current_user
from BaseRepository import SessionLocal
from stripe_service import StripeService

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def check_plan_limits(
    request: Request,
    current_user: dict = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Verifica los límites del plan del usuario consultando Stripe.
    
    Args:
        request: Objeto de solicitud de FastAPI
        current_user: Usuario autenticado
        db: Sesión de base de datos
        
    Returns:
        dict: Información de la suscripción del usuario
        
    Raises:
        HTTPException: Si el usuario ha excedido los límites de su plan
    """
    user_id = current_user["id"]
    
    try:
        # Obtener el usuario con su suscripción
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Obtener la suscripción del usuario
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id
        ).first()
        
        # Obtener los límites del plan actual
        plan_limits, is_trial = StripeService.get_subscription_limits(db, user_id, subscription)
        
        # Verificar límites de almacenamiento
        if plan_limits['max_store_capacity'] != -1:  # -1 significa ilimitado
            current_job_count = db.query(Job).filter(Job.user_id == user_id).count()
            if current_job_count >= plan_limits['max_store_capacity']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail=(
                        f"Has alcanzado el límite de {plan_limits['max_store_capacity']} "
                        "trabajos almacenados. Por favor, actualiza tu plan para continuar."
                    )
                )
        
        # Verificar límites de extracciones (si es necesario)
        # Esto podría implementarse con un contador en UserSubscription si es necesario
        
        return {
            'plan': plan_limits['name'],
            'limits': {
                'max_extractions': plan_limits['max_extractions'],
                'max_store_capacity': plan_limits['max_store_capacity']
            },
            'is_trial': is_trial,
            'features': plan_limits.get('features', []),
            'description': plan_limits.get('description', '')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # En caso de error inesperado, registrar y denegar acceso
        print(f"Error al verificar límites de plan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al verificar los límites de tu plan. Por favor, inténtalo de nuevo más tarde."
        )
