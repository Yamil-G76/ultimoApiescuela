from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config.db import get_db
from models.user import User, UserDetail
# from auth.security import Security  # lo dejamos comentado por ahora

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

    # Si más adelante querés activar JWT real, usás Security.generate_token
    # token = Security.generate_token({
    #     "id": user.id,
    #     "username": user.username,
    #     "type": user_type,
    # })

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
# USUARIOS PAGINADOS
# -------------------------------------------------------------------

@router.post("/users/paginated")
def get_users_paginated(payload: UsersPaginatedRequest, db: Session = Depends(get_db)):
    """
    Devuelve usuarios paginados para la vista de Admin.

    Request:
    {
      "page": 1,
      "page_size": 20
    }

    Response:
    {
      "success": true,
      "message": "...",
      "data": {
        "items": [ {id, username, first_name, last_name, type}, ... ],
        "page": 1,
        "page_size": 20,
        "total_items": 52,
        "total_pages": 3,
        "has_next": true
      }
    }
    """

    page = payload.page if payload.page > 0 else 1
    page_size = payload.page_size if payload.page_size > 0 else 20

    # Join con detalles (outerjoin por si algún usuario no tiene aún detalle)
    query = (
        db.query(User)
        .outerjoin(UserDetail, UserDetail.id_user == User.id)
        .order_by(User.id)
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
        # En tu modelo, la relación se llama "userdetail"
        detalle: Optional[UserDetail] = u.userdetail

        # Mantener la misma lógica de rol que en el login:
        user_type = detalle.type if detalle and detalle.type else "alumno"

        items.append(
            {
                "id": u.id,
                "username": u.username,
                "first_name": getattr(detalle, "first_name", None),
                "last_name": getattr(detalle, "last_name", None),
                "type": user_type,  # nunca None: siempre "admin"/"alumno" o lo que definas
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
