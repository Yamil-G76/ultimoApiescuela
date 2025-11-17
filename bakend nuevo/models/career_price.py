# models/career_price.py

from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from config.db import Base
import datetime


class CareerPriceHistory(Base):
    __tablename__ = "carrera_precios"

    id = Column(Integer, primary_key=True, index=True)
    id_carrera = Column(Integer, ForeignKey("carreras.id"), nullable=False)
    monto = Column(Integer, nullable=False)
    fecha_desde = Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relación con Career
    carrera = relationship("Career", back_populates="precios")

    def __init__(self, id_carrera, monto, fecha_desde=None):
        self.id_carrera = id_carrera
        self.monto = monto
        self.fecha_desde = fecha_desde or datetime.datetime.utcnow()
