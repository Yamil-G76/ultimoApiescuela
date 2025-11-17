# models/news.py

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from config.db import Base
import datetime

class News(Base):
    __tablename__ = "noticias"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Autor → admin que publicó la noticia
    id_admin = Column(Integer, ForeignKey("detalles_usuario.id"), nullable=False)
    admin = relationship("UserDetail")

    def __init__(self, title, content, id_admin, image_url=None):
        self.title = title
        self.content = content
        self.image_url = image_url
        self.id_admin = id_admin
