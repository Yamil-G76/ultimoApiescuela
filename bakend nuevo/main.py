# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.db import Base, engine

from routes import user_routes
from routes import news_routes     
from routes import career_routes        
from routes import payment_routes
from routes import enrollment_routes 
from routes.upload_routes import router as upload_router

app = FastAPI()

# 👇 ORÍGENES PERMITIDOS (tu front)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # mientras desarrollás, podés usar ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 👉 Montar carpeta estática para servir imágenes de noticias
app.mount(
    "/static/news_images",
    StaticFiles(directory="static/news_images"),
    name="news_images"
)

# 👉 Crear tablas
Base.metadata.create_all(bind=engine)

# 👉 Incluir routers
app.include_router(user_routes.router)
app.include_router(upload_router)
app.include_router(news_routes.router)     # /news, /news/paginated, etc.
app.include_router(career_routes.router)   # /careers, /careers/paginated, etc.
app.include_router(payment_routes.router) 
app.include_router(enrollment_routes.router)  
@app.get("/")
def root():
    return {"message": "API Escuela OK"}
