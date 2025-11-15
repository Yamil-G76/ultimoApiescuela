# routes/user_routes.py
from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional

from config.db import get_db
from auth.security import Security
from models.user import User, UserDetail
from models.career import Career
from models.usuarioxcarrera import UsuarioXcarrera
import datetime

router = APIRouter()


# ---------------------------
# Helpers
# ---------------------------
def standard_response(success: bool, message: str, data=None):
    return {"success": success, "message": message, "data": data}


async def require_token_and_role(request: Request, required_role: Optional[str] = None):
    """
    Verifica token y (si required_role) el rol. Retorna payload si OK,
    o lanza JSONResponse con error que el endpoint debe devolver.
    """
    try:
        user_data = await Security.get_current_user(request)
    except Exception as e:
        return JSONResponse(status_code=401, content=standard_response(False, str(e), None))

    if required_role and user_data.get("rol") != required_role:
        return JSONResponse(
            status_code=403,
            content=standard_response(False, "Acceso denegado. Rol insuficiente.", None),
        )

    return user_data


# ---------------------------
# Schemas locales (simples) para el demo
# ---------------------------
from pydantic import BaseModel


class InputLogin(BaseModel):
    username: str
    password: str


class InputUser(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    dni: str
    email: str
    type: str  # "admin" o "alumno"


class InputAddCareer(BaseModel):
    id_userdetail: int
    id_carrera: int


class InputPaginated(BaseModel):
    limit: int = 20
    last_seen_id: Optional[int] = None
    search: Optional[str] = ""


# ---------------------------
# Endpoints
# ---------------------------

@router.post("/login")
async def login_user(body: InputLogin, db: Session = Depends(get_db)):
    """
    Login público que devuelve JWT con rol incluido.
    """
    try:
        user = db.query(User).options(joinedload(User.userdetail)).filter(User.username == body.username).first()
        if not user:
            return JSONResponse(status_code=401, content=standard_response(False, "Usuario o contraseña inválidos", None))

        # Demo: password en claro (aceptado para esta demo)
        if user.password != body.password:
            return JSONResponse(status_code=401, content=standard_response(False, "Usuario o contraseña inválidos", None))

        # Construir payload mínimo para token
        usuario_payload = {
            "idusuario": user.id,
            "usuario": user.username,
            "type": user.userdetail.type if user.userdetail else "alumno",
        }

        token = Security.generate_token(usuario_payload)
        if not token:
            return JSONResponse(status_code=500, content=standard_response(False, "Error generando token", None))

        # devolver token y algunos datos de userdetail (no sensibles)
        data = {
            "token": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "first_name": user.userdetail.first_name if user.userdetail else None,
                "last_name": user.userdetail.last_name if user.userdetail else None,
                "type": user.userdetail.type if user.userdetail else None,
            },
        }
        return JSONResponse(status_code=200, content=standard_response(True, "Login correcto", data))

    except Exception as ex:
        print("Error en login:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno", None))


@router.post("/add")
async def create_user(request: Request, body: InputUser, db: Session = Depends(get_db)):
    """
    Crear usuario (solo admin). Crea User y UserDetail asociados.
    """
    # 1) Validar token y rol
    token_check = await require_token_and_role(request, required_role="admin")
    if isinstance(token_check, JSONResponse):
        return token_check

    try:
        # Validaciones simples de unicidad
        exists = db.query(User).filter(User.username == body.username).first()
        if exists:
            return JSONResponse(status_code=400, content=standard_response(False, "Username ya existe", None))

        exists_dni = db.query(UserDetail).filter(UserDetail.dni == body.dni).first()
        if exists_dni:
            return JSONResponse(status_code=400, content=standard_response(False, "DNI ya registrado", None))

        # Crear registros
        new_user = User(body.username, body.password)
        new_detail = UserDetail(body.first_name, body.last_name, body.dni, body.email, body.type)
        new_user.userdetail = new_detail

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return JSONResponse(status_code=201, content=standard_response(True, "Usuario creado con éxito", {
            "id": new_user.id,
            "username": new_user.username
        }))

    except Exception as ex:
        db.rollback()
        print("Error creando usuario:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al crear usuario", None))


@router.post("/addcareer")
async def add_career_to_user(request: Request, body: InputAddCareer, db: Session = Depends(get_db)):
    """
    Inscribir alumno a carrera (solo admin).
    """
    token_check = await require_token_and_role(request, required_role="admin")
    if isinstance(token_check, JSONResponse):
        return token_check

    try:
        # Validar existencia de userdetail y carrera
        userdetail = db.query(UserDetail).filter(UserDetail.id == body.id_userdetail).first()
        if not userdetail:
            return JSONResponse(status_code=404, content=standard_response(False, "Detalle de usuario no encontrado", None))

        carrera = db.query(Career).filter(Career.id == body.id_carrera).first()
        if not carrera:
            return JSONResponse(status_code=404, content=standard_response(False, "Carrera no encontrada", None))

        # Evitar duplicados: verificar si ya existe la inscripción
        exists = db.query(UsuarioXcarrera).filter(
            UsuarioXcarrera.id_userdetail == body.id_userdetail,
            UsuarioXcarrera.id_carrera == body.id_carrera
        ).first()
        if exists:
            return JSONResponse(status_code=400, content=standard_response(False, "El alumno ya está inscripto en esa carrera", None))

        # Crear inscripción
        ins = UsuarioXcarrera(body.id_carrera, body.id_userdetail)
        db.add(ins)
        db.commit()
        db.refresh(ins)

        return JSONResponse(status_code=201, content=standard_response(True, "Inscripción creada", {
            "id": ins.id,
            "detalle_id": ins.id_userdetail,
            "carrera_id": ins.id_carrera
        }))

    except Exception as ex:
        db.rollback()
        print("Error al inscribir:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al inscribir", None))


@router.post("/paginated")
async def get_users_paginated(request: Request, body: InputPaginated, db: Session = Depends(get_db)):
    """
    Paginación simple por cursor (keyset). Requiere token admin.
    """
    token_check = await require_token_and_role(request, required_role="admin")
    if isinstance(token_check, JSONResponse):
        return token_check

    try:
        limit = max(1, min(100, int(body.limit or 20)))
        last_seen = body.last_seen_id

        query = db.query(User).options(joinedload(User.userdetail)).order_by(User.id)
        if last_seen:
            query = query.filter(User.id > last_seen)

        if body.search:
            pattern = f"%{body.search}%"
            # filtrar por nombre/apellido/email a través de UserDetail
            query = query.join(User.userdetail).filter(
                (UserDetail.first_name.ilike(pattern)) |
                (UserDetail.last_name.ilike(pattern)) |
                (UserDetail.email.ilike(pattern))
            )

        results = query.limit(limit).all()

        users_out = []
        for u in results:
            users_out.append({
                "id": u.id,
                "username": u.username,
                "first_name": u.userdetail.first_name if u.userdetail else None,
                "last_name": u.userdetail.last_name if u.userdetail else None,
                "dni": u.userdetail.dni if u.userdetail else None,
                "email": u.userdetail.email if u.userdetail else None,
                "type": u.userdetail.type if u.userdetail else None,
            })

        next_cursor = users_out[-1]["id"] if len(users_out) == limit else None

        return JSONResponse(status_code=200, content=standard_response(True, "Página obtenida", {
            "users": users_out,
            "next_cursor": next_cursor
        }))

    except Exception as ex:
        print("Error paginated:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al paginar", None))
