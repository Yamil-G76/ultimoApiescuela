# routes/alumno_routes.py
from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from config.db import get_db
from auth.security import Security
from models.user import User, UserDetail
from models.usuarioxcarrera import UsuarioXcarrera
from models.career import Career
from models.payment import Payment

router = APIRouter()


# ---------------------------
# Helpers locales
# ---------------------------
def standard_response(success: bool, message: str, data=None):
    return {"success": success, "message": message, "data": data}


async def get_token_payload(request: Request):
    """
    Extrae y valida el token; devuelve payload decodificado o JSONResponse de error.
    """
    try:
        payload = await Security.get_current_user(request)
        return payload
    except Exception as e:
        return JSONResponse(status_code=401, content=standard_response(False, str(e), None))


def _extract_role(payload: dict) -> Optional[str]:
    # Soportar diferentes claves posibles por compatibilidad
    return payload.get("rol") or payload.get("type") or payload.get("role")


def _extract_user_id(payload: dict) -> Optional[int]:
    return payload.get("id") or payload.get("idusuario") or payload.get("user_id")


# ---------------------------
# Endpoints alumno
# ---------------------------

@router.get("/perfil")
async def obtener_perfil(request: Request, db: Session = Depends(get_db)):
    """
    Devuelve el perfil del alumno autenticado.
    """
    token_payload = await get_token_payload(request)
    if isinstance(token_payload, JSONResponse):
        return token_payload

    role = _extract_role(token_payload)
    if role != "alumno":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo alumnos.", None))

    user_id = _extract_user_id(token_payload)
    if not user_id:
        return JSONResponse(status_code=400, content=standard_response(False, "Token inválido: user id no encontrado", None))

    try:
        # Obtener el User y su detalle
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return JSONResponse(status_code=404, content=standard_response(False, "Usuario no encontrado", None))

        detail = db.query(UserDetail).filter(UserDetail.id_user == user_id).first()
        perfil = {
            "id": user.id,
            "username": user.username,
            "first_name": detail.first_name if detail else None,
            "last_name": detail.last_name if detail else None,
            "dni": detail.dni if detail else None,
            "email": detail.email if detail else None,
            "rol": detail.type if detail else None,
        }

        return JSONResponse(status_code=200, content=standard_response(True, "Perfil obtenido", perfil))
    except Exception as ex:
        print("Error obtener_perfil:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al obtener perfil", None))


@router.get("/carreras")
async def obtener_carreras(request: Request, db: Session = Depends(get_db)):
    """
    Devuelve la lista de carreras donde el alumno está inscripto.
    Cada elemento incluye: id_inscripcion, carrera_id, nombre, costo_mensual, duracion_meses, fecha_inscripcion.
    """
    token_payload = await get_token_payload(request)
    if isinstance(token_payload, JSONResponse):
        return token_payload

    role = _extract_role(token_payload)
    if role != "alumno":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo alumnos.", None))

    user_id = _extract_user_id(token_payload)
    if not user_id:
        return JSONResponse(status_code=400, content=standard_response(False, "Token inválido: user id no encontrado", None))

    try:
        # Obtener detalle del alumno (detalles_usuario)
        detalle = db.query(UserDetail).filter(UserDetail.id_user == user_id).first()
        if not detalle:
            return JSONResponse(status_code=404, content=standard_response(False, "Detalle del usuario no encontrado", None))

        # Buscar inscripciones
        inscripciones = db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id_userdetail == detalle.id).all()

        out = []
        for ins in inscripciones:
            # cargar carrera relacionada
            carrera = db.query(Career).filter(Career.id == ins.id_carrera).first()
            out.append({
                "id_inscripcion": ins.id,
                "carrera_id": carrera.id if carrera else None,
                "carrera_nombre": carrera.name if carrera else None,
                "costo_mensual": carrera.costo_mensual if carrera else None,
                "duracion_meses": carrera.duracion_meses if carrera else None,
                "fecha_inscripcion": getattr(ins, "fecha_inscripcion", None)
            })

        return JSONResponse(status_code=200, content=standard_response(True, "Carreras del alumno", {"carreras": out}))
    except Exception as ex:
        print("Error obtener_carreras:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al obtener carreras", None))


@router.get("/pagos")
async def obtener_pagos(
    request: Request,
    carrera_id: Optional[int] = Query(None, description="Filtrar por id de carrera"),
    inscripcion_id: Optional[int] = Query(None, description="Filtrar por id de inscripción"),
    limit: int = Query(200, gt=0, le=1000),
    db: Session = Depends(get_db)
):
    """
    Devuelve los pagos del alumno autenticado.
    Si se proporciona carrera_id o inscripcion_id, filtra por esos valores.
    """
    token_payload = await get_token_payload(request)
    if isinstance(token_payload, JSONResponse):
        return token_payload

    role = _extract_role(token_payload)
    if role != "alumno":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo alumnos.", None))

    user_id = _extract_user_id(token_payload)
    if not user_id:
        return JSONResponse(status_code=400, content=standard_response(False, "Token inválido: user id no encontrado", None))

    try:
        detalle = db.query(UserDetail).filter(UserDetail.id_user == user_id).first()
        if not detalle:
            return JSONResponse(status_code=404, content=standard_response(False, "Detalle del usuario no encontrado", None))

        # Base: inscripciones del alumno
        q = db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id_userdetail == detalle.id)

        if inscripcion_id:
            q = q.filter(UsuarioXcarrera.id == inscripcion_id)
        if carrera_id:
            q = q.filter(UsuarioXcarrera.id_carrera == carrera_id)

        inscripciones = q.all()
        pagos_out = []

        for ins in inscripciones:
            # obtener carrera para info contextual
            carrera = db.query(Career).filter(Career.id == ins.id_carrera).first()
            pagos = db.query(Payment).filter(Payment.id_usuarioxcarrera == ins.id).order_by(Payment.numero_cuota).limit(limit).all()
            for p in pagos:
                pagos_out.append({
                    "id_pago": p.id,
                    "id_inscripcion": ins.id,
                    "carrera_id": carrera.id if carrera else None,
                    "carrera_nombre": carrera.name if carrera else None,
                    "numero_cuota": p.numero_cuota,
                    "monto": p.monto,
                    "adelantado": getattr(p, "adelantado", False),
                    "anulado": getattr(p, "anulado", False),
                    "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None
                })

        return JSONResponse(status_code=200, content=standard_response(True, "Pagos del alumno", {"pagos": pagos_out}))
    except Exception as ex:
        print("Error obtener_pagos:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al obtener pagos", None))
