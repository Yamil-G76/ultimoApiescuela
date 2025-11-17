# routes/enrollment_routes.py

from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from config.db import get_db
from models.user import UserDetail
from models.career import Career
from models.usuarioxcarrera import UsuarioXcarrera
from models.payment import Payment

# ✅ IMPORTANTE: ahora con prefix="/enrollments"
router = APIRouter(
    prefix="/enrollments",
    tags=["enrollments"],
)


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class EnrollmentCreate(BaseModel):
    user_id: int      # id de User (usuarios.id)
    career_id: int    # id de Career (carreras.id)

    @validator("user_id", "career_id")
    def id_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Los IDs deben ser mayores a 0")
        return v


class EnrollmentsByUserRequest(BaseModel):
    user_id: int
    page: int = 1
    page_size: int = 20

    @validator("user_id")
    def user_id_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("user_id debe ser mayor a 0")
        return v

    @validator("page")
    def page_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page debe ser mayor a 0")
        return v

    @validator("page_size")
    def page_size_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page_size debe ser mayor a 0")
        return v


# -------------------------------------------------------------------
# CREAR INSCRIPCIÓN (Usuario x Carrera)
# -------------------------------------------------------------------

# 👇 OJO: ya no ponemos "/enrollments", el prefix lo agrega
@router.post("")
def create_enrollment(payload: EnrollmentCreate, db: Session = Depends(get_db)):
    """
    Crea una inscripción de un alumno (User) a una Carrera usando la tabla pivote UsuarioXcarrera.
    Path final: POST /enrollments
    """
    # 1) Buscar detalle del usuario
    userdetail: Optional[UserDetail] = (
        db.query(UserDetail)
        .filter(UserDetail.id_user == payload.user_id)
        .first()
    )
    if not userdetail:
        raise HTTPException(
            status_code=400,
            detail="El usuario no tiene detalle (UserDetail) creado. No se puede inscribir.",
        )

    # 2) Verificar que la carrera exista
    career: Optional[Career] = db.query(Career).filter(Career.id == payload.career_id).first()
    if not career:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    # 3) Evitar inscripción duplicada
    existing = (
        db.query(UsuarioXcarrera)
        .filter(
            UsuarioXcarrera.id_userdetail == userdetail.id,
            UsuarioXcarrera.id_carrera == payload.career_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="El alumno ya está inscripto en esa carrera",
        )

    # 4) Crear inscripción
    nueva = UsuarioXcarrera(
        id_carrera=payload.career_id,
        id_userdetail=userdetail.id,
    )

    db.add(nueva)
    db.commit()
    db.refresh(nueva)

    return {
        "success": True,
        "message": "Inscripción creada correctamente",
        "data": {
            "id": nueva.id,
            "user_id": payload.user_id,
            "userdetail_id": userdetail.id,
            "career_id": career.id,
            "career_name": career.name,
            "inicio_cursado": career.inicio_cursado,
        },
    }


# -------------------------------------------------------------------
# LISTAR INSCRIPCIONES DE UN USUARIO (POST + paginado)
# -------------------------------------------------------------------

# Path final: POST /enrollments/by-user
@router.post("/by-user")
def get_enrollments_by_user(
    payload: EnrollmentsByUserRequest,
    db: Session = Depends(get_db),
):
    """
    Devuelve las inscripciones (UsuarioXcarrera) de un usuario con paginado.
    """
    # Buscar detalle del usuario
    userdetail: Optional[UserDetail] = (
        db.query(UserDetail)
        .filter(UserDetail.id_user == payload.user_id)
        .first()
    )

    # Si el usuario no tiene detalle, devolvemos lista vacía
    if not userdetail:
        return {
            "success": True,
            "message": "El usuario no tiene detalle ni inscripciones",
            "data": {
                "items": [],
                "page": payload.page,
                "page_size": payload.page_size,
                "total_items": 0,
                "total_pages": 1,
                "has_next": False,
            },
        }

    page = payload.page
    page_size = payload.page_size

    # Join con Career para tener nombre y datos de la carrera
    query = (
        db.query(UsuarioXcarrera, Career)
        .join(Career, UsuarioXcarrera.id_carrera == Career.id)
        .filter(UsuarioXcarrera.id_userdetail == userdetail.id)
        .order_by(UsuarioXcarrera.id)
    )

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    rows: List[tuple[UsuarioXcarrera, Career]] = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": uxc.id,
            "career_id": career.id,
            "career_name": career.name,
            "inicio_cursado": career.inicio_cursado,
        }
        for (uxc, career) in rows
    ]

    return {
        "success": True,
        "message": "Inscripciones obtenidas correctamente",
        "data": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }


# -------------------------------------------------------------------
# ELIMINAR INSCRIPCIÓN
# -------------------------------------------------------------------

# Path final: DELETE /enrollments/{enrollment_id}
@router.delete("/{enrollment_id}")
def delete_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    """
    Elimina una inscripción UsuarioXcarrera.
    Opcionalmente podrías bloquear si ya tiene pagos asociados.
    """
    uxc: Optional[UsuarioXcarrera] = (
        db.query(UsuarioXcarrera)
        .filter(UsuarioXcarrera.id == enrollment_id)
        .first()
    )
    if not uxc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    pagos_existentes = (
        db.query(Payment)
        .filter(Payment.id_usuarioxcarrera == uxc.id)
        .first()
    )
    if pagos_existentes:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar la inscripción porque tiene pagos asociados",
        )

    db.delete(uxc)
    db.commit()

    return {
        "success": True,
        "message": "Inscripción eliminada correctamente",
    }
