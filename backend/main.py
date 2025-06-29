import os
from fastapi import FastAPI
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import backend.bcrypt_fix
from backend.auth_controller import router as auth_router
from backend.job_controller import router as job_router
from backend.BaseRepository import Base, engine

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "chrome-extension://gmfhflhogdfhgegedmffabnejkcapcbj"],
    allow_origin_regex="chrome-extension://.*",  # Permitir cualquier extensión de Chrome
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(job_router)