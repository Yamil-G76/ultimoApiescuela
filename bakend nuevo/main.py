from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.db import Base, engine
from routes import user_routes, career_routes, payment_routes

app = FastAPI()

# -----------------------------
# 🔹 Configuración de CORS
# -----------------------------
origins = [

    "*",   # <-- si querés permitir todo
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # or ["*"]
    allow_credentials=True,
    allow_methods=["*"],        # GET, POST, PUT, DELETE...
    allow_headers=["*"],
)

# -----------------------------
# 🔹 Routers
# -----------------------------
app.include_router(user_routes.router)
app.include_router(career_routes.router)
app.include_router(payment_routes.router)

# -----------------------------
# 🔹 Crear tablas al iniciar
# -----------------------------
@app.on_event("startup")
def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print(" Base de datos inicializada correctamente.")
    except Exception as e:
        print("Error al inicializar la base de datos:", e)
