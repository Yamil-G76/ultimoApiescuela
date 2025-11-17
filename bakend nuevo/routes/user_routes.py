# routes/user_routes.py

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, validator
from sqlalchemy.orm import Session

from config.db import get_db
from models.user import User, UserDetail


from sqlalchemy import or_



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
    search: Optional[str] = None  #  búsqueda


class UserBase(BaseModel):
    username: str
    first_name: str
    last_name: str
    dni: str
    email: EmailStr
    type: str  # "admin" o "alumno"

    @validator("username", "first_name", "last_name", "dni", "type")
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Campo obligatorio")
        return v

    @validator("type")
    def valid_type(cls, v: str) -> str:
        if v not in ("admin", "alumno"):
            raise ValueError("El tipo debe ser 'admin' o 'alumno'")
        return v

    @validator("dni")
    def valid_dni(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El DNI es obligatorio")
        if not v.isdigit():
            raise ValueError("El DNI debe ser numérico")
        if len(v) < 7 or len(v) > 9:
            raise ValueError("El DNI debe tener entre 7 y 9 dígitos")
        return v


class UserCreate(UserBase):
    password: str

    @validator("password")
    def valid_password(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La contraseña es obligatoria")
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v


class UserUpdate(UserBase):
    """Editar usuario (NO cambia password)."""
    pass


# -------------------------------------------------------------------
# LOGIN
# -------------------------------------------------------------------

@router.post("/login")
def login_user(payload: LoginInput, db: Session = Depends(get_db)):
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

    detalle: Optional[UserDetail] = user.userdetail
    user_type = detalle.type if detalle and detalle.type else "alumno"

    token = f"fake-token-user-{user.id}"

    return {
        "success": True,
        "message": "Login correcto",
        "data": {
            "token": token,
            "usuario": {
                "id": user.id,
                "username": user.username,
                "type": user_type,
            },
        },
    }


# -------------------------------------------------------------------
# CREAR USUARIO (con password)
# -------------------------------------------------------------------

@router.post("/users")
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Username único
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    # DNI único
    existing_dni = db.query(UserDetail).filter(UserDetail.dni == payload.dni).first()
    if existing_dni:
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")

    # Crear User con password enviada (sin hash, por ahora)
    new_user = User(username=payload.username, password=payload.password)
    db.add(new_user)
    db.flush()  # para tener new_user.id

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
# EDITAR USUARIO (sin tocar password)
# -------------------------------------------------------------------

@router.put("/users/{user_id}")
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)):
    user: Optional[User] = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    detalle: Optional[UserDetail] = user.userdetail

    # Username único (si cambia)
    existing = (
        db.query(User)
        .filter(User.username == payload.username, User.id != user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")

    # DNI único (si cambia)
    if detalle:
        existing_dni = (
            db.query(UserDetail)
            .filter(UserDetail.dni == payload.dni, UserDetail.id != detalle.id)
            .first()
        )
        if existing_dni:
            raise HTTPException(status_code=400, detail="El DNI ya está registrado")

    # Actualizar User (NO cambiamos password)
    user.username = payload.username

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

    if detalle:
        db.delete(detalle)
    db.delete(user)
    db.commit()

    return {"success": True, "message": "Usuario eliminado correctamente"}


# -------------------------------------------------------------------
# USUARIOS PAGINADOS + BÚSQUEDA
# -------------------------------------------------------------------
@router.post("/users/paginated")
def get_users_paginated(
    payload: UsersPaginatedRequest,
    db: Session = Depends(get_db),
):
    """
    Devuelve SOLO alumnos (type = 'alumno') paginados para la vista de Admin.
    Se puede buscar por username, nombre, apellido, DNI o email.
    """

    page = payload.page if payload.page > 0 else 1
    page_size = payload.page_size if payload.page_size > 0 else 20

    # Base: solo alumnos
    query = (
        db.query(User)
        .outerjoin(UserDetail, UserDetail.id_user == User.id)
        .filter(UserDetail.type == "alumno")  # 👈 solo alumnos
        .order_by(User.id)
    )

    # Búsqueda
    if payload.search:
        search = f"%{payload.search}%"
        query = query.filter(
            or_(
                User.username.ilike(search),
                UserDetail.first_name.ilike(search),
                UserDetail.last_name.ilike(search),
                UserDetail.dni.ilike(search),
                UserDetail.email.ilike(search),
            )
        )

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    users_db = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for u in users_db:
        detalle: Optional[UserDetail] = u.userdetail

        items.append(
            {
                "id": u.id,
                "username": u.username,
                "first_name": getattr(detalle, "first_name", None),
                "last_name": getattr(detalle, "last_name", None),
                "dni": getattr(detalle, "dni", None),
                "email": getattr(detalle, "email", None),
                # Podés seguir mandando el type aunque no lo uses en la tabla
                "type": "alumno",
            }
        )

    return {
        "success": True,
        "message": "Alumnos obtenidos correctamente",
        "data": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
