# routes/career_routes.py
from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional, List

from config.db import get_db
from auth.security import Security
from models.career import Career
from models.usuarioxcarrera import UsuarioXcarrera
from models.payment import Payment

router = APIRouter()


# ---------------------------
# Helpers locales
# ---------------------------
def standard_response(success: bool, message: str, data=None):
    return {"success": success, "message": message, "data": data}


async def require_admin(request: Request):
    """
    Verifica token y que el rol sea admin.
    Retorna payload si OK o JSONResponse (error) si no.
    """
    try:
        user_data = await Security.get_current_user(request)
    except Exception as e:
        return JSONResponse(status_code=401, content=standard_response(False, str(e), None))

    if user_data.get("rol") != "admin":
        return JSONResponse(status_code=403, content=standard_response(False, "Acceso denegado. Solo administradores.", None))

    return user_data


# ---------------------------
# Schemas simples (local)
# ---------------------------
from pydantic import BaseModel, Field


class InputCareer(BaseModel):
    name: str = Field(..., min_length=2)
    costo_mensual: int = Field(..., gt=0)
    duracion_meses: int = Field(..., gt=0)
    inicio_cursado: Optional[str] = None  # ISO date string opcional


class UpdateCareer(BaseModel):
    name: Optional[str]
    costo_mensual: Optional[int]
    duracion_meses: Optional[int]
    inicio_cursado: Optional[str]


# ---------------------------
# Endpoints
# ---------------------------

@router.get("/")
def list_carreras(
    q: Optional[str] = Query(None, description="Texto a buscar en el nombre"),
    limit: int = Query(50, gt=0, le=200),
    last_seen_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Listado público (paginable y con búsqueda por nombre).
    """
    try:
        query = db.query(Career).order_by(Career.id)

        if last_seen_id:
            query = query.filter(Career.id > last_seen_id)

        if q:
            pattern = f"%{q}%"
            query = query.filter(Career.name.ilike(pattern))

        items = query.limit(limit).all()

        out = []
        for c in items:
            out.append({
                "id": c.id,
                "name": c.name,
                "costo_mensual": c.costo_mensual,
                "duracion_meses": c.duracion_meses,
                "inicio_cursado": c.inicio_cursado.isoformat() if c.inicio_cursado else None
            })

        next_cursor = out[-1]["id"] if len(out) == limit else None

        return JSONResponse(status_code=200, content=standard_response(True, "Listado de carreras", {"carreras": out, "next_cursor": next_cursor}))
    except Exception as ex:
        print("Error list_carreras:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al listar carreras", None))


@router.post("/")
async def create_carrera(request: Request, body: InputCareer, db: Session = Depends(get_db)):
    """
    Crear carrera (solo admin).
    """
    admin_check = await require_admin(request)
    if isinstance(admin_check, JSONResponse):
        return admin_check

    try:
        # Unicidad por nombre
        exists = db.query(Career).filter(Career.name == body.name).first()
        if exists:
            return JSONResponse(status_code=400, content=standard_response(False, "Ya existe una carrera con ese nombre", None))

        carrera = Career(body.name, body.costo_mensual, body.duracion_meses, body.inicio_cursado)
        db.add(carrera)
        db.commit()
        db.refresh(carrera)

        data = {
            "id": carrera.id,
            "name": carrera.name,
            "costo_mensual": carrera.costo_mensual,
            "duracion_meses": carrera.duracion_meses,
            "inicio_cursado": carrera.inicio_cursado.isoformat() if carrera.inicio_cursado else None
        }

        return JSONResponse(status_code=201, content=standard_response(True, "Carrera creada", data))
    except Exception as ex:
        db.rollback()
        print("Error create_carrera:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al crear carrera", None))


@router.get("/{carrera_id}")
def get_carrera(carrera_id: int, db: Session = Depends(get_db)):
    """
    Obtener detalle de una carrera por id.
    """
    try:
        carrera = db.query(Career).filter(Career.id == carrera_id).first()
        if not carrera:
            return JSONResponse(status_code=404, content=standard_response(False, "Carrera no encontrada", None))

        data = {
            "id": carrera.id,
            "name": carrera.name,
            "costo_mensual": carrera.costo_mensual,
            "duracion_meses": carrera.duracion_meses,
            "inicio_cursado": carrera.inicio_cursado.isoformat() if carrera.inicio_cursado else None
        }
        return JSONResponse(status_code=200, content=standard_response(True, "Detalle de carrera", data))
    except Exception as ex:
        print("Error get_carrera:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al obtener carrera", None))


@router.put("/{carrera_id}")
async def update_carrera(carrera_id: int, request: Request, body: UpdateCareer, db: Session = Depends(get_db)):
    """
    Actualizar carrera (solo admin).
    """
    admin_check = await require_admin(request)
    if isinstance(admin_check, JSONResponse):
        return admin_check

    try:
        carrera = db.query(Career).filter(Career.id == carrera_id).first()
        if not carrera:
            return JSONResponse(status_code=404, content=standard_response(False, "Carrera no encontrada", None))

        # Aplicar cambios permitidos
        if body.name is not None:
            # verificar unicidad si cambia el nombre
            exists = db.query(Career).filter(Career.name == body.name, Career.id != carrera_id).first()
            if exists:
                return JSONResponse(status_code=400, content=standard_response(False, "El nombre ya está en uso por otra carrera", None))
            carrera.name = body.name
        if body.costo_mensual is not None:
            carrera.costo_mensual = body.costo_mensual
        if body.duracion_meses is not None:
            carrera.duracion_meses = body.duracion_meses
        if body.inicio_cursado is not None:
            carrera.inicio_cursado = body.inicio_cursado

        db.add(carrera)
        db.commit()
        db.refresh(carrera)

        data = {
            "id": carrera.id,
            "name": carrera.name,
            "costo_mensual": carrera.costo_mensual,
            "duracion_meses": carrera.duracion_meses,
            "inicio_cursado": carrera.inicio_cursado.isoformat() if carrera.inicio_cursado else None
        }
        return JSONResponse(status_code=200, content=standard_response(True, "Carrera actualizada", data))
    except Exception as ex:
        db.rollback()
        print("Error update_carrera:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al actualizar carrera", None))


@router.delete("/{carrera_id}")
async def delete_carrera(carrera_id: int, request: Request, force: Optional[bool] = Query(False), db: Session = Depends(get_db)):
    """
    Eliminar carrera (solo admin).
    Si tiene inscripciones, por defecto bloquea la eliminación.
    Si se pasa ?force=true el admin confirma y se borran inscripciones y pagos asociados.
    """
    admin_check = await require_admin(request)
    if isinstance(admin_check, JSONResponse):
        return admin_check

    try:
        carrera = db.query(Career).filter(Career.id == carrera_id).first()
        if not carrera:
            return JSONResponse(status_code=404, content=standard_response(False, "Carrera no encontrada", None))

        # Contar inscripciones
        inscripciones = db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id_carrera == carrera_id).all()
        if inscripciones and not force:
            return JSONResponse(
                status_code=400,
                content=standard_response(False, "La carrera tiene alumnos inscriptos. Use force=true para forzar borrado", {"inscripciones_count": len(inscripciones)})
            )

        if inscripciones and force:
            # borrar pagos asociados primero
            ids_ins = [ins.id for ins in inscripciones]
            if ids_ins:
                db.query(Payment).filter(Payment.id_usuarioxcarrera.in_(ids_ins)).delete(synchronize_session=False)
            # borrar inscripciones
            db.query(UsuarioXcarrera).filter(UsuarioXcarrera.id_carrera == carrera_id).delete(synchronize_session=False)
            db.commit()

        # borrar la carrera
        db.delete(carrera)
        db.commit()

        return JSONResponse(status_code=200, content=standard_response(True, "Carrera eliminada correctamente", None))

    except Exception as ex:
        db.rollback()
        print("Error delete_carrera:", ex)
        return JSONResponse(status_code=500, content=standard_response(False, "Error interno al eliminar carrera", None))
