# routes/payment_routes.py

from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, validator
from sqlalchemy import or_
from sqlalchemy.orm import Session

from config.db import get_db
from models.payment import Payment as PaymentModel
from models.usuarioxcarrera import UsuarioXcarrera
from models.career import Career
from models.career_price import CareerPriceHistory
from models.user import User, UserDetail

router = APIRouter(
    prefix="/payments",
    tags=["payments"],
)


# -------------------------------------------------------------------
# HELPER: Obtener precio vigente según fecha de pago
# -------------------------------------------------------------------

def get_price_for_date(db: Session, id_carrera: int, fecha_pago: datetime) -> int:
    """
    Devuelve el precio de la carrera que estaba vigente en 'fecha_pago',
    usando CareerPriceHistory. Si no encuentra historial, usa costo_mensual actual.
    """

    # 1) Último precio cuya fecha_desde sea <= fecha_pago
    precio_hist = (
        db.query(CareerPriceHistory)
        .filter(
            CareerPriceHistory.id_carrera == id_carrera,
            CareerPriceHistory.fecha_desde <= fecha_pago,
        )
        .order_by(CareerPriceHistory.fecha_desde.desc())
        .first()
    )

    if precio_hist:
        return precio_hist.monto

    # 2) Si no hay historial, usar costo_mensual actual de la carrera
    career: Optional[Career] = db.query(Career).filter(Career.id == id_carrera).first()
    if not career:
        raise HTTPException(status_code=404, detail="Carrera no encontrada al calcular precio")

    return career.costo_mensual


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class PaymentCreate(BaseModel):
    id_usuarioxcarrera: int
    numero_cuota: int
    fecha_pago: Optional[datetime] = None
    adelantado: bool = False

    @validator("id_usuarioxcarrera", "numero_cuota")
    def ids_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Los IDs y número de cuota deben ser mayores a 0")
        return v


class PaymentsByEnrollmentRequest(BaseModel):
    id_usuarioxcarrera: int
    page: int = 1
    page_size: int = 20
    include_anulados: bool = True

    @validator("id_usuarioxcarrera")
    def enrollment_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("id_usuarioxcarrera debe ser mayor a 0")
        return v

    @validator("page", "page_size")
    def page_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page y page_size deben ser mayores a 0")
        return v


class PaymentCancelRequest(BaseModel):
    motivo: Optional[str] = None  # por si después querés guardar motivo en la BD


class PaymentsPaginatedRequest(BaseModel):
    page: int = 1
    page_size: int = 20
    search: Optional[str] = None  # username, nombre, dni, carrera

    @validator("page", "page_size")
    def page_min(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("page y page_size deben ser mayores a 0")
        return v


# -------------------------------------------------------------------
# CREAR PAGO
# -------------------------------------------------------------------

@router.post("")
def create_payment(payload: PaymentCreate, db: Session = Depends(get_db)):
    """
    Crea un pago para una inscripción (UsuarioXcarrera).
    - Calcula el monto según el historial de precios de la carrera
      usando la fecha de pago (default ahora).
    - Evita duplicar la misma cuota si ya está pagada (no anulada).

    Path final: POST /payments
    """

    # 1) Verificar que la inscripción exista
    uxc = (
        db.query(UsuarioXcarrera)
        .filter(UsuarioXcarrera.id == payload.id_usuarioxcarrera)
        .first()
    )
    if not uxc:
        raise HTTPException(status_code=404, detail="Inscripción (usuarioxcarrera) no encontrada")

    # 2) Evitar duplicar cuota (no anulada)
    existing = (
        db.query(PaymentModel)
        .filter(
            PaymentModel.id_usuarioxcarrera == payload.id_usuarioxcarrera,
            PaymentModel.numero_cuota == payload.numero_cuota,
            PaymentModel.anulado == False,  # noqa: E712
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"La cuota {payload.numero_cuota} ya fue pagada para esta inscripción",
        )

    # 3) Determinar fecha de pago
    fecha_pago = payload.fecha_pago or datetime.utcnow()

    # 4) Calcular monto según precio vigente en esa fecha
    monto = get_price_for_date(db, uxc.id_carrera, fecha_pago)

    # 5) Crear Payment
    nuevo_pago = PaymentModel(
        id_usuarioxcarrera=payload.id_usuarioxcarrera,
        numero_cuota=payload.numero_cuota,
        monto=monto,
        adelantado=payload.adelantado,
    )
    nuevo_pago.fecha_pago = fecha_pago

    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)

    return {
        "success": True,
        "message": "Pago registrado correctamente",
        "data": {
            "id": nuevo_pago.id,
            "id_usuarioxcarrera": nuevo_pago.id_usuarioxcarrera,
            "numero_cuota": nuevo_pago.numero_cuota,
            "fecha_pago": nuevo_pago.fecha_pago,
            "monto": nuevo_pago.monto,
            "adelantado": nuevo_pago.adelantado,
            "anulado": nuevo_pago.anulado,
        },
    }


# -------------------------------------------------------------------
# LISTAR PAGOS POR INSCRIPCIÓN (POST + paginado)
# -------------------------------------------------------------------

@router.post("/by-enrollment")
def get_payments_by_enrollment(
    payload: PaymentsByEnrollmentRequest,
    db: Session = Depends(get_db),
):
    """
    Devuelve los pagos de una inscripción (UsuarioXcarrera) con paginado.

    Path final: POST /payments/by-enrollment
    """

    # Verificar que la inscripción exista
    uxc = (
        db.query(UsuarioXcarrera)
        .filter(UsuarioXcarrera.id == payload.id_usuarioxcarrera)
        .first()
    )
    if not uxc:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada")

    page = payload.page
    page_size = payload.page_size

    query = db.query(PaymentModel).filter(
        PaymentModel.id_usuarioxcarrera == payload.id_usuarioxcarrera
    )

    # si include_anulados = False, filtramos solo los NO anulados
    if not payload.include_anulados:
        query = query.filter(PaymentModel.anulado == False)  # noqa: E712

    # Últimos pagos primero (cuotas más altas primero)
    query = query.order_by(PaymentModel.numero_cuota.desc())

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    pagos_db = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": p.id,
            "numero_cuota": p.numero_cuota,
            "fecha_pago": p.fecha_pago,
            "monto": p.monto,
            "adelantado": p.adelantado,
            "anulado": p.anulado,
        }
        for p in pagos_db
    ]

    return {
        "success": True,
        "message": "Pagos obtenidos correctamente",
        "data": {
            "id_usuarioxcarrera": payload.id_usuarioxcarrera,
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }


# -------------------------------------------------------------------
# ANULAR PAGO
# -------------------------------------------------------------------

@router.put("/{payment_id}/cancel")
def cancel_payment(
    payment_id: int,
    payload: PaymentCancelRequest,
    db: Session = Depends(get_db),
):
    """
    Marca un pago como anulado.

    Path final: PUT /payments/{payment_id}/cancel
    """
    p = db.query(PaymentModel).filter(PaymentModel.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if p.anulado:
        raise HTTPException(status_code=400, detail="El pago ya está anulado")

    p.anulado = True
    db.commit()
    db.refresh(p)

    return {
        "success": True,
        "message": "Pago anulado correctamente",
        "data": {
            "id": p.id,
            "id_usuarioxcarrera": p.id_usuarioxcarrera,
            "numero_cuota": p.numero_cuota,
            "fecha_pago": p.fecha_pago,
            "monto": p.monto,
            "adelantado": p.adelantado,
            "anulado": p.anulado,
        },
    }


# -------------------------------------------------------------------
# LISTA GLOBAL DE PAGOS (para /admin/payments)
# -------------------------------------------------------------------

@router.post("/paginated")
def get_payments_paginated(
    payload: PaymentsPaginatedRequest,
    db: Session = Depends(get_db),
):
    """
    Lista global de pagos con joins a alumno y carrera.

    Path final: POST /payments/paginated

    Permite 'search' por:
    - username
    - nombre / apellido
    - dni
    - nombre de carrera
    """

    page = payload.page
    page_size = payload.page_size

    query = (
        db.query(
            PaymentModel,
            UsuarioXcarrera,
            User,
            UserDetail,
            Career,
        )
        .join(UsuarioXcarrera, PaymentModel.id_usuarioxcarrera == UsuarioXcarrera.id)
        .join(UserDetail, UsuarioXcarrera.id_userdetail == UserDetail.id)
        .join(User, UserDetail.id_user == User.id)
        .join(Career, UsuarioXcarrera.id_carrera == Career.id)
    )

    if payload.search:
        search = f"%{payload.search}%"
        query = query.filter(
            or_(
                User.username.ilike(search),
                UserDetail.first_name.ilike(search),
                UserDetail.last_name.ilike(search),
                UserDetail.dni.ilike(search),
                Career.name.ilike(search),
            )
        )

    # Últimos pagos primero: por fecha de pago y luego id
    query = query.order_by(PaymentModel.fecha_pago.desc(), PaymentModel.id.desc())

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    rows = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for p, uxc, user, ud, career in rows:
        alumno = {
            "id": user.id,
            "username": user.username,
            "first_name": ud.first_name,
            "last_name": ud.last_name,
            "dni": ud.dni,
            "email": ud.email,
        }

        career_obj = {
            "id": career.id,
            "name": career.name,
        }

        items.append(
            {
                # --- datos del pago ---
                "id": p.id,
                "numero_cuota": p.numero_cuota,
                "fecha_pago": p.fecha_pago,
                "monto": p.monto,
                "adelantado": p.adelantado,
                "anulado": p.anulado,

                # --- objetos anidados para el FRONT ---
                "alumno": alumno,
                "career": career_obj,

                # --- campos planos (compatibilidad) ---
                "id_usuarioxcarrera": uxc.id,
                "user_id": user.id,
                "username": user.username,
                "first_name": ud.first_name,
                "last_name": ud.last_name,
                "dni": ud.dni,
                "email": ud.email,
                "career_id": career.id,
                "career_name": career.name,
            }
        )

    return {
        "success": True,
        "message": "Pagos listados correctamente",
        "data": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
