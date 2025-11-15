# routes/payment_routes.py
from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from config.db import get_db
from auth.security import Security
from models.payment import Payment
from models.usuarioxcarrera import UsuarioXcarrera
from models.user import UserDetail, User

router = APIRouter()


# ---------------------------
# Helpers locales
# ---------------------------
def standard_response(success: bool, message: str, data=None):
    return {"success": success, "message": message, "data": data}


async def require_token(request: Request):
    """
    Verifica token y devuelve payload o JSONResponse de error.
    """
    try:
        user_data = await Security.get_current_user(request)
    except Exception as e:
        return JSONResponse(status_code=401, content=standard_response(False, str(e), None))
    return user_data


# ---------------------------
# Schemas locales (Pydantic simples)
# ---------------------------
from pydantic import BaseModel, Field


class InputPayment(BaseModel):
    id_usuarioxcarrera: int = Field(..., gt=0)
    numero_cuota: int = Field(..., gt=0)
    monto: int = Field(..., gt=0)
    adelantado: Optional[bool] = False
    observacion: Optional[str] = None


# ---------------------------
# Endpoints
# ---------------------------

@router.post("/")
async def crear_pago(request: Request, body: InputPayment, db: Session = Depends(get_db)):
    """
    Crear un pago (solo admin).
    Valida duplicados: no puede existir otro pago con el mismo id_usuarioxcarrera y numero_cuota
    a menos que el pago esté anulado.
    """
    token_check = await require_token(request)
    if isinstance(token_check, JSONResponse):
        return token_check

    # sólo admin puede crear pagos
    if token_check.get("rol") != "admin":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo administradores.", None))

    try:
        # verificar existencia de la inscripción
        ins = db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id == body.id_usuarioxcarrera).first()
        if not ins:
            return JSONResponse(status_code=404, content=standard_response(False, "Inscripción (usuarioxcarrera) no encontrada", None))

        # validar duplicado (mismo numero_cuota y no anulado)
        exists = db.query(Payment).filter(
            Payment.id_usuarioxcarrera == body.id_usuarioxcarrera,
            Payment.numero_cuota == body.numero_cuota,
            Payment.anulado == False
        ).first()
        if exists:
            return JSONResponse(status_code=400, content=standard_response(False, "Ya existe un pago registrado para esa cuota", None))

        pago = Payment(
            id_usuarioxcarrera=body.id_usuarioxcarrera,
            numero_cuota=body.numero_cuota,
            monto=body.monto,
            adelantado=body.adelantado
        )
        # si el modelo tiene observacion
        if hasattr(pago, "observacion") and body.observacion:
            pago.observacion = body.observacion

        db.add(pago)
        db.commit()
        db.refresh(pago)

        data = {
            "id": pago.id,
            "id_usuarioxcarrera": pago.id_usuarioxcarrera,
            "numero_cuota": pago.numero_cuota,
            "monto": pago.monto,
            "adelantado": pago.adelantado,
            "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None
        }
        return JSONResponse(status_code=201, content=standard_response(True, "Pago registrado", data))

    except Exception as ex:
        db.rollback()
        print("Error crear_pago:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al crear pago", None))


@router.get("/")
async def listar_pagos(
    request: Request,
    usuario_x_carrera_id: Optional[int] = Query(None),
    detalle_id: Optional[int] = Query(None),
    carrera_id: Optional[int] = Query(None),
    numero_cuota: Optional[int] = Query(None),
    limit: int = Query(100, gt=0, le=500),
    db: Session = Depends(get_db)
):
    """
    Listar pagos. Por seguridad, por defecto requiere admin.
    Filtros útiles: usuario_x_carrera_id, detalle_id (alumno), carrera_id, numero_cuota.
    """
    token_check = await require_token(request)
    if isinstance(token_check, JSONResponse):
        return token_check

    # si no es admin, rechazamos (para listados generales)
    if token_check.get("rol") != "admin":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo administradores.", None))

    try:
        query = db.query(Payment).order_by(Payment.id)

        if usuario_x_carrera_id:
            query = query.filter(Payment.id_usuarioxcarrera == usuario_x_carrera_id)

        if numero_cuota:
            query = query.filter(Payment.numero_cuota == numero_cuota)

        # filtro por alumno (detalle_id) o por carrera requiere join con UsuarioXcarrera
        if detalle_id or carrera_id:
            query = query.join(UsuarioXcarrera)
            if detalle_id:
                query = query.filter(UsuarioXcarrera.id_userdetail == detalle_id)
            if carrera_id:
                query = query.filter(UsuarioXcarrera.id_carrera == carrera_id)

        pagos = query.limit(limit).all()

        out = []
        for p in pagos:
            out.append({
                "id": p.id,
                "id_usuarioxcarrera": p.id_usuarioxcarrera,
                "numero_cuota": p.numero_cuota,
                "monto": p.monto,
                "adelantado": p.adelantado,
                "anulado": getattr(p, "anulado", False),
                "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None
            })

        return JSONResponse(status_code=200, content=standard_response(True, "Pagos listados", {"pagos": out}))
    except Exception as ex:
        print("Error listar_pagos:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al listar pagos", None))


@router.get("/by_inscripcion/{inscripcion_id}")
async def listar_pagos_por_inscripcion(inscripcion_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Listar pagos de una inscripción específica.
    Admin puede ver cualquiera; alumno solo puede ver si la inscripción le pertenece.
    """
    token_check = await require_token(request)
    if isinstance(token_check, JSONResponse):
        return token_check

    try:
        ins = db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id == inscripcion_id).first()
        if not ins:
            return JSONResponse(status_code=404, content=standard_response(False, "Inscripción no encontrada", None))

        # Si no es admin, validar que el token pertenezca al usuario dueño de la inscripción
        if token_check.get("rol") != "admin":
            # token contiene id del usuario (user id), pero la inscripción referencia userdetail id
            # buscamos el userdetail del token: el token tiene 'id' (user id). Necesitamos mapear.
            token_user_id = token_check.get("id")
            # obtener detalle del usuario logeado
            detalle = db.query(UserDetail).filter(UserDetail.id_user == token_user_id).first()
            if not detalle or detalle.id != ins.id_userdetail:
                return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. No es la inscripción del alumno.", None))

        pagos = db.query(Payment).filter(Payment.id_usuarioxcarrera == inscripcion_id).order_by(Payment.numero_cuota).all()
        out = []
        for p in pagos:
            out.append({
                "id": p.id,
                "numero_cuota": p.numero_cuota,
                "monto": p.monto,
                "adelantado": p.adelantado,
                "anulado": getattr(p, "anulado", False),
                "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None
            })

        return JSONResponse(status_code=200, content=standard_response(True, "Pagos de la inscripción", {"pagos": out}))
    except Exception as ex:
        print("Error listar_pagos_por_inscripcion:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al listar pagos", None))


@router.delete("/{pago_id}")
async def delete_pago(pago_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Eliminar pago (solo admin). Borrado físico.
    """
    token_check = await require_token(request)
    if isinstance(token_check, JSONResponse):
        return token_check

    if token_check.get("rol") != "admin":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo administradores.", None))

    try:
        pago = db.query(Payment).filter(Payment.id == pago_id).first()
        if not pago:
            return JSONResponse(status_code=404, content=standard_response(False, "Pago no encontrado", None))

        db.delete(pago)
        db.commit()
        return JSONResponse(status_code=200, content=standard_response(True, "Pago eliminado", None))
    except Exception as ex:
        db.rollback()
        print("Error delete_pago:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al eliminar pago", None))
