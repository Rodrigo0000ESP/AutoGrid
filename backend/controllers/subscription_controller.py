from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import os

from models import User, UserSubscription
from dependencies import get_db, get_current_user
from stripe_service import StripeService
from BaseRepository import BaseRepository

router = APIRouter(prefix="/subscription", tags=["subscription"])

# Obtener la URL del frontend desde las variables de entorno
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

@router.get("/plans")
async def get_available_plans():
    """Obtener todos los planes disponibles"""
    try:
        plans = StripeService.get_all_plans()
        return {
            "status": "success",
            "data": [
                {
                    "id": plan['name'].lower(),
                    "name": plan['name'],
                    "description": plan['description'],
                    "features": plan['features'],
                    "limits": {
                        "max_extractions": plan['max_extractions'],
                        "max_store_capacity": plan['max_store_capacity']
                    },
                    "stripe_price_id": plan['stripe_price_id']
                }
                for plan in plans
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener los planes: {str(e)}"
        )

@router.post("/create-checkout-session")
async def create_checkout_session(
    price_id: str = Body(..., embed=True),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear una sesión de pago en Stripe"""
    try:
        # Obtener el usuario de la base de datos para verificar si ya tiene un customer_id
        user = db.query(User).filter(User.id == current_user["id"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Si el usuario no tiene un customer_id en Stripe, crear uno
        if not user.stripe_customer_id:
            customer = StripeService.create_customer(
                email=user.email,
                name=user.username or user.email.split('@')[0]
            )
            user.stripe_customer_id = customer.id
            db.commit()
        
        # Crear la sesión de pago
        success_url = f"{FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{FRONTEND_URL}/subscription/canceled"
        
        session = StripeService.create_checkout_session(
            customer_id=user.stripe_customer_id,
            price_id=price_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        return {
            "status": "success",
            "data": {
                "session_id": session["session_id"],
                "url": session["url"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al crear sesión de pago: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al crear la sesión de pago: {str(e)}"
        )

@router.get("/success")
async def success(session_id: str):
    """Redirigir al usuario después de un pago exitoso"""
    return RedirectResponse(f"{FRONTEND_URL}/subscription/success?session_id={session_id}")

@router.get("/canceled")
async def canceled():
    """Redirigir al usuario si cancela el pago"""
    return RedirectResponse(f"{FRONTEND_URL}/subscription/canceled")

@router.get("/status")
async def get_subscription_status(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener el estado actual de la suscripción del usuario"""
    try:
        # Obtener la suscripción del usuario
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == current_user["id"]
        ).first()
        
        # Obtener los límites del plan actual
        plan_limits, is_trial = StripeService.get_subscription_limits(
            db, current_user["id"], subscription
        )
        
        return {
            "status": "success",
            "data": {
                "plan": plan_limits['name'],
                "is_trial": is_trial,
                "limits": {
                    "max_extractions": plan_limits['max_extractions'],
                    "max_store_capacity": plan_limits['max_store_capacity']
                },
                "features": plan_limits.get('features', []),
                "description": plan_limits.get('description', '')
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener el estado de la suscripción: {str(e)}"
        )

@router.post("/webhook")
async def webhook_received(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Manejar webhooks de Stripe
    
    Este endpoint recibe eventos de Stripe para mantener sincronizadas las suscripciones.
    Los eventos manejados incluyen:
    - checkout.session.completed: Cuando un usuario completa el proceso de pago
    - customer.subscription.updated: Cuando se actualiza una suscripción
    - customer.subscription.deleted: Cuando se cancela una suscripción
    - invoice.payment_succeeded: Cuando un pago se completa exitosamente
    - invoice.payment_failed: Cuando falla un intento de pago
    """
    # Obtener el secreto del webhook de las variables de entorno
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret no configurado"
        )
    
    # Obtener el payload y la firma del webhook
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        # Procesar el webhook
        event_processed = StripeService.handle_webhook_event(
            payload=payload,
            sig_header=sig_header,
            endpoint_secret=webhook_secret,
            db=db  # Pasar la sesión de la base de datos
        )
        
        if event_processed:
            return {"status": "success"}
        else:
            return {"status": "event_not_handled"}
            
    except HTTPException as he:
        # Re-lanzar excepciones HTTP existentes
        raise he
    except Exception as e:
        import traceback
        print(f"Error en webhook: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar el webhook: {str(e)}"
        )
