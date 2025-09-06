import os
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import bcrypt_fix
from auth_controller import router as auth_router
from job_controller import router as job_router
from controllers.subscription_controller import router as subscription_router
from BaseRepository import Base, engine

# Cargar variables de entorno
load_dotenv()

app = FastAPI()

# Configurar CORS
# Lista de orígenes permitidos
allowed_origins = [
    "http://localhost:4321",  # Tu frontend local
    "https://autogrid.net",   # Tu dominio de producción
    "chrome-extension://gmfhflhogdfhgegedmffabnejkcapcbj"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://[a-zA-Z0-9-]+\.autogrid\.net$",  # Subdominios de autogrid.net
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight response for 10 minutes
)

# Crear tablas de la base de datos
Base.metadata.create_all(bind=engine)

# Incluir routers
app.include_router(auth_router)
app.include_router(job_router)
app.include_router(subscription_router)

# Ruta de verificación de salud
@app.get("/health")
async def health_check():
    return {"status": "ok"}