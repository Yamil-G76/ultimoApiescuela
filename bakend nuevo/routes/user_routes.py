from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.db import get_db
from models.user import User, UserDetail

router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class LoginInput(BaseModel):
    username: str
    password: str


class UsersPaginatedRequest(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None  # 🔍 nuevo campo de búsqueda


class UserCreate(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    dni: str
    email: str
    type: str  # "admin" o "alumno"


class UserUpdate(BaseModel):
    username: str
    password: Optional[str] = None  # si viene vacío, no se cambia
    first_name: str
    last_name: str
    dni: str
    email: str
    type: str  # "admin" o "alumno"


# -------------------------------------------------------------------
# LOGIN
# -------------------------------------------------------------------

@router.post("/login")
def login_user(payload: LoginInput, db: Session = Depends(get_db)):
    """
    Login simple para el front:
    - Busca usuario por username.
    - Compara password en texto plano.
    - Devuelve token de prueba + datos básicos del usuario (incluye type desde UserDetail).
    """

    # Buscar usuario
    user: Optional[User] = (
        db.query(User)
        .filter(User.username == payload.username)
        .first()
    )

    if not user or user.password != payload.password:
        return {
            "success": False,
            "message": "Usuario o contraseña incorrectos",
            "data": None,
        }

    # Buscar detalle (puede ser None si aún no lo creaste)
    detalle: Optional[UserDetail] = user.userdetail

    # Rol: si hay detalle usamos su type, si no, por defecto "alumno"
    user_type = detalle.type if detalle and detalle.type else "alumno"

    # Por ahora, token “fake” pero estable:
    token = f"fake-token-user-{user.id}"

    return {
        "success": True,
        "message": "Login correcto",
        "data": {
            "token": token,
            "usuario": {
                "id": user.id,
                "username": user.username,
                "type": user_type,  # "admin" o "alumno"
            },
        },
    }


# -------------------------------------------------------------------
# CREAR USUARIO
# -------------------------------------------------------------------

@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Validar username único
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    # Validar DNI único
    existing_dni = db.query(UserDetail).filter(UserDetail.dni == payload.dni).first()
    if existing_dni:
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")

    # Crear User
    new_user = User(username=payload.username, password=payload.password)
    db.add(new_user)
    db.flush()  # para tener new_user.id sin commit todavía

    # Crear UserDetail
    new_detail = UserDetail(
        first_name=payload.first_name,
        last_name=payload.last_name,
        dni=payload.dni,
        email=payload.email,
        type=payload.type,
    )
    new_detail.id_user = new_user.id
    db.add(new_detail)

    db.commit()
    db.refresh(new_user)
    db.refresh(new_detail)

    return {
        "success": True,
        "message": "Usuario creado correctamente",
        "data": {
            "id": new_user.id,
            "username": new_user.username,
            "first_name": new_detail.first_name,
            "last_name": new_detail.last_name,
            "dni": new_detail.dni,
            "email": new_detail.email,
            "type": new_detail.type,
        },
    }


# -------------------------------------------------------------------
# OBTENER UN USUARIO POR ID
# -------------------------------------------------------------------

@router.get("/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    detalle: Optional[UserDetail] = user.userdetail

    return {
        "success": True,
        "data": {
            "id": user.id,
            "username": user.username,
            "first_name": getattr(detalle, "first_name", None),
            "last_name": getattr(detalle, "last_name", None),
            "dni": getattr(detalle, "dni", None),
            "email": getattr(detalle, "email", None),
            "type": detalle.type if detalle and detalle.type else "alumno",
        },
    }


# -------------------------------------------------------------------
# EDITAR USUARIO
# -------------------------------------------------------------------

@router.put("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    detalle: Optional[UserDetail] = user.userdetail

    # Validar username único (si cambia)
    existing = (
        db.query(User)
        .filter(User.username == payload.username, User.id != user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    # Validar DNI único (si cambia)
    if detalle:
        existing_dni = (
            db.query(UserDetail)
            .filter(UserDetail.dni == payload.dni, UserDetail.id != detalle.id)
            .first()
        )
        if existing_dni:
            raise HTTPException(status_code=400, detail="El DNI ya está registrado")

    # Actualizar User
    user.username = payload.username
    if payload.password:  # solo si viene algo
        user.password = payload.password

    # Actualizar UserDetail
    if not detalle:
        detalle = UserDetail(
            first_name=payload.first_name,
            last_name=payload.last_name,
            dni=payload.dni,
            email=payload.email,
            type=payload.type,
        )
        detalle.id_user = user.id
        db.add(detalle)
    else:
        detalle.first_name = payload.first_name
        detalle.last_name = payload.last_name
        detalle.dni = payload.dni
        detalle.email = payload.email
        detalle.type = payload.type

    db.commit()
    db.refresh(user)
    db.refresh(detalle)

    return {
        "success": True,
        "message": "Usuario actualizado correctamente",
        "data": {
            "id": user.id,
            "username": user.username,
            "first_name": detalle.first_name,
            "last_name": detalle.last_name,
            "dni": detalle.dni,
            "email": detalle.email,
            "type": detalle.type,
        },
    }


# -------------------------------------------------------------------
# ELIMINAR USUARIO
# -------------------------------------------------------------------

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    detalle: Optional[UserDetail] = user.userdetail

    # ⚠️ Esto es simple: si hay relaciones (carreras/pagos) puede fallar por FK.
    # Para proyecto académico está bien; en producción habría que manejar cascadas o estados.
    if detalle:
        db.delete(detalle)
    db.delete(user)
    db.commit()

    return {"success": True, "message": "Usuario eliminado correctamente"}


# -------------------------------------------------------------------
# USUARIOS PAGINADOS + BÚSQUEDA
# -------------------------------------------------------------------

@router.post("/users/paginated")
def get_users_paginated(payload: UsersPaginatedRequest, db: Session = Depends(get_db)):
    """
    Devuelve usuarios paginados para la vista de Admin.
    Permite búsqueda por username, nombre, apellido, dni o email.
    """

    page = payload.page if payload.page > 0 else 1
    page_size = payload.page_size if payload.page_size > 0 else 20

    query = (
        db.query(User)
        .outerjoin(UserDetail, UserDetail.id_user == User.id)
        .order_by(User.id)
    )

    if payload.search:
        search = f"%{payload.search}%"
        query = query.filter(
            (User.username.ilike(search)) |
            (UserDetail.first_name.ilike(search)) |
            (UserDetail.last_name.ilike(search)) |
            (UserDetail.dni.ilike(search)) |
            (UserDetail.email.ilike(search))
        )

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    users_db: List[User] = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for u in users_db:
        detalle: Optional[UserDetail] = u.userdetail
        user_type = detalle.type if detalle and detalle.type else "alumno"

        items.append(
            {
                "id": u.id,
                "username": u.username,
                "first_name": getattr(detalle, "first_name", None),
                "last_name": getattr(detalle, "last_name", None),
                "dni": getattr(detalle, "dni", None),
                "email": getattr(detalle, "email", None),
                "type": user_type,
            }
        )

    return {
        "success": True,
        "message": "Usuarios obtenidos correctamente",
        "data": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
