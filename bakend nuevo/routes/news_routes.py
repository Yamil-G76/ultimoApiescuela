from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from config.db import get_db
from models.news import News

router = APIRouter()

# -------------------------
# SCHEMAS
# -------------------------

class NewsCreate(BaseModel):
    title: str
    content: str
    id_admin: int
    image_url: Optional[str] = None

class NewsUpdate(BaseModel):
    title: str
    content: str
    image_url: Optional[str] = None

class NewsPaginatedRequest(BaseModel):
    page: int = 1
    page_size: int = 10


# -------------------------
# CREAR NOTICIA
# -------------------------

@router.post("/news")
def create_news(payload: NewsCreate, db: Session = Depends(get_db)):

    new = News(
        title=payload.title,
        content=payload.content,
        id_admin=payload.id_admin,
        image_url=payload.image_url
    )

    db.add(new)
    db.commit()
    db.refresh(new)

    return {
        "success": True,
        "message": "Noticia creada correctamente",
        "data": {
            "id": new.id,
            "title": new.title,
            "content": new.content,
            "image_url": new.image_url,
            "created_at": new.created_at
        }
    }


# -------------------------
# OBTENER UNA NOTICIA POR ID
# -------------------------

@router.get("/news/{news_id}")
def get_news(news_id: int, db: Session = Depends(get_db)):

    n = db.query(News).filter(News.id == news_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")

    return {
        "success": True,
        "data": {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "image_url": n.image_url,
            "created_at": n.created_at,
        },
    }


# -------------------------
# EDITAR NOTICIA
# -------------------------

@router.put("/news/{news_id}")
def update_news(news_id: int, payload: NewsUpdate, db: Session = Depends(get_db)):

    n = db.query(News).filter(News.id == news_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")

    n.title = payload.title
    n.content = payload.content
    n.image_url = payload.image_url

    db.commit()
    db.refresh(n)

    return {
        "success": True,
        "message": "Noticia actualizada correctamente",
        "data": {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "image_url": n.image_url,
            "created_at": n.created_at,
        },
    }


# -------------------------
# ELIMINAR NOTICIA
# -------------------------

@router.delete("/news/{news_id}")
def delete_news(news_id: int, db: Session = Depends(get_db)):

    n = db.query(News).filter(News.id == news_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Noticia no encontrada")

    db.delete(n)
    db.commit()

    return {
        "success": True,
        "message": "Noticia eliminada correctamente",
    }


# -------------------------
# NOTICIAS PAGINADAS
# -------------------------

@router.post("/news/paginated")
def get_news_paginated(payload: NewsPaginatedRequest, db: Session = Depends(get_db)):

    page = max(payload.page, 1)
    page_size = max(payload.page_size, 1)

    query = db.query(News).order_by(News.created_at.desc())

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    noticias = (
        query
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "image_url": n.image_url,
            "created_at": n.created_at
        }
        for n in noticias
    ]

    return {
        "success": True,
        "message": "Noticias obtenidas",
        "data": {
            "items": items,
            "page": page,
            "page_size": page_size,
            "total_items": total_items,
            "total_pages": total_pages,
            "has_next": page < total_pages,
        },
    }
