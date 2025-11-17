# routes/career_routes.py

from typing import Optional, List

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from config.db import get_db
from models.career import Career
from models.career_price import CareerPriceHistory  # 👈 historial de precios

router = APIRouter(
    prefix="/careers",
    tags=["careers"],
)


# -------------------------------------------------------------------
# SCHEMAS BASE
# -------------------------------------------------------------------

class CareerBase(BaseModel):
    name: str
    costo_mensual: int
    duracion_meses: int
    inicio_cursado: Optional[datetime] = None

    @validator("name")
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El nombre de la carrera es obligatorio")
        if len(v) > 50:
            raise ValueError("El nombre no puede superar los 50 caracteres")
        return v

    @validator("costo_mensual")
    def costo_positive_and_reasonable(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("El costo mensual debe ser mayor a 0")
        if v > 1_000_000:
            raise ValueError("El costo mensual es demasiado alto")
        return v

    @validator("duracion_meses")
    def duracion_positive_and_reasonable(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("La duración en meses debe ser mayor a 0")
        if v > 60:
            raise ValueError("La duración no puede superar los 60 meses")
        return v

    @validator("inicio_cursado")
    def inicio_cursado_valid(cls, v: Optional[datetime]) -> Optional[datetime]:
        # Podés meter más reglas (no muy viejo, no en 1900, etc.)
        return v


class CareerCreate(CareerBase):
    """Crear carrera."""
    pass


class CareerUpdate(CareerBase):
    """Editar carrera."""
    pass


class CareersPaginatedRequest(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None

    @validator("page", "page_size")
    def page_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page y page_size deben ser mayores a 0")
        return v


class CareerPricesPaginatedRequest(BaseModel):
    id_carrera: int
    page: int = 1
    page_size: int = 20

    @validator("id_carrera")
    def id_carrera_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("id_carrera debe ser mayor a 0")
        return v

    @validator("page", "page_size")
    def page_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page y page_size deben ser mayores a 0")
        return v


# -------------------------------------------------------------------
# CREAR CARRERA
# -------------------------------------------------------------------

@router.post("")
def create_career(payload: CareerCreate, db: Session = Depends(get_db)):
    # Validar nombre único
    existing = db.query(Career).filter(Career.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una carrera con ese nombre")

    inicio = payload.inicio_cursado or datetime.utcnow()

    nueva = Career(
        name=payload.name,
        costo_mensual=payload.costo_mensual,
        duracion_meses=payload.duracion_meses,
        inicio_cursado=inicio,
    )

    db.add(nueva)
    db.flush()  # para obtener nueva.id antes del commit

    # 💡 Crear registro inicial de precio
    precio_inicial = CareerPriceHistory(
        id_carrera=nueva.id,
        monto=payload.costo_mensual,
        fecha_desde=datetime.utcnow(),
    )
    db.add(precio_inicial)

    db.commit()
    db.refresh(nueva)

    return {
      "success": True,
      "message": "Carrera creada correctamente",
      "data": {
          "id": nueva.id,
          "name": nueva.name,
          "costo_mensual": nueva.costo_mensual,
          "duracion_meses": nueva.duracion_meses,
          "inicio_cursado": nueva.inicio_cursado,
      },
    }


# -------------------------------------------------------------------
# OBTENER UNA CARRERA POR ID
# -------------------------------------------------------------------

@router.get("/{career_id}")
def get_career(career_id: int, db: Session = Depends(get_db)):
    c: Optional[Career] = db.query(Career).filter(Career.id == career_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    return {
        "success": True,
        "data": {
            "id": c.id,
            "name": c.name,
            "costo_mensual": c.costo_mensual,
            "duracion_meses": c.duracion_meses,
            "inicio_cursado": c.inicio_cursado,
        },
    }


# -------------------------------------------------------------------
# EDITAR CARRERA (con historial de precios)
# -------------------------------------------------------------------

@router.put("/{career_id}")
def update_career(career_id: int, payload: CareerUpdate, db: Session = Depends(get_db)):
    c: Optional[Career] = db.query(Career).filter(Career.id == career_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    # Validar nombre único si cambia
    existing = (
        db.query(Career)
        .filter(Career.name == payload.name, Career.id != career_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe otra carrera con ese nombre")

    # Detectar cambio de costo
    costo_anterior = c.costo_mensual
    costo_nuevo = payload.costo_mensual

    c.name = payload.name
    c.costo_mensual = costo_nuevo
    c.duracion_meses = payload.duracion_meses
    c.inicio_cursado = payload.inicio_cursado or c.inicio_cursado

    # 💡 Si el costo cambió, registramos un nuevo precio a partir de AHORA
    if costo_nuevo != costo_anterior:
        nuevo_precio = CareerPriceHistory(
            id_carrera=c.id,
            monto=costo_nuevo,
            fecha_desde=datetime.utcnow(),  # 👉 a partir de este momento
        )
        db.add(nuevo_precio)

    db.commit()
    db.refresh(c)

    return {
        "success": True,
        "message": "Carrera actualizada correctamente",
        "data": {
            "id": c.id,
            "name": c.name,
            "costo_mensual": c.costo_mensual,
            "duracion_meses": c.duracion_meses,
            "inicio_cursado": c.inicio_cursado,
        },
    }


# -------------------------------------------------------------------
# ELIMINAR CARRERA
# -------------------------------------------------------------------

@router.delete("/{career_id}")
def delete_career(career_id: int, db: Session = Depends(get_db)):
    c: Optional[Career] = db.query(Career).filter(Career.id == career_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    db.delete(c)
    db.commit()

    return {
        "success": True,
        "message": "Carrera eliminada correctamente",
    }


# -------------------------------------------------------------------
# LISTADO PAGINADO + BÚSQUEDA
# -------------------------------------------------------------------

@router.post("/paginated")
def get_careers_paginated(
    payload: CareersPaginatedRequest,
    db: Session = Depends(get_db),
):
    page = payload.page
    page_size = payload.page_size

    query = db.query(Career).order_by(Career.id)

    if payload.search:
        search = f"%{payload.search}%"
        query = query.filter(Career.name.ilike(search))

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    careers_db: List[Career] = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": c.id,
            "name": c.name,
            "costo_mensual": c.costo_mensual,
            "duracion_meses": c.duracion_meses,
            "inicio_cursado": c.inicio_cursado,
        }
        for c in careers_db
    ]

    return {
        "success": True,
        "message": "Carreras obtenidas correctamente",
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
# HISTORIAL DE PRECIOS DE UNA CARRERA (POST + paginado)
# -------------------------------------------------------------------

@router.post("/prices/paginated")
def get_career_prices_paginated(
    payload: CareerPricesPaginatedRequest,
    db: Session = Depends(get_db),
):
    """
    Devuelve el historial de precios de una carrera en orden descendente por fecha_desde.
    Path final: POST /careers/prices/paginated
    """

    # Verificar que la carrera exista
    carrera: Optional[Career] = (
        db.query(Career).filter(Career.id == payload.id_carrera).first()
    )
    if not carrera:
        raise HTTPException(status_code=404, detail="Carrera no encontrada")

    page = payload.page
    page_size = payload.page_size

    query = (
        db.query(CareerPriceHistory)
        .filter(CareerPriceHistory.id_carrera == payload.id_carrera)
        .order_by(CareerPriceHistory.fecha_desde.desc())
    )

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    precios_db = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": p.id,
            "monto": p.monto,
            "fecha_desde": p.fecha_desde,
            "created_at": p.created_at,
        }
        for p in precios_db
    ]

    return {
        "success": True,
        "message": "Historial de precios obtenido correctamente",
        "data": {
            "id_carrera": payload.id_carrera,
            "career_name": carrera.name,
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
