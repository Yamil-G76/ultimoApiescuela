from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from config.db import Base
import datetime


# ==============================================
# MODELO: Carrera
# ==============================================
class Career(Base):
    __tablename__ = "carreras"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    costo_mensual = Column(Integer, nullable=False)
    duracion_meses = Column(Integer, nullable=False)
    inicio_cursado = Column(DateTime, default=datetime.datetime.utcnow)

    # Relación con la tabla pivote (usuarios inscritos)
    usuariosxcarrera = relationship("UsuarioXcarrera", back_populates="carrera")

    def __init__(self, name, costo_mensual, duracion_meses, inicio_cursado=None):
        self.name = name
        self.costo_mensual = costo_mensual
        self.duracion_meses = duracion_meses
        self.inicio_cursado = inicio_cursado or datetime.datetime.utcnow()
