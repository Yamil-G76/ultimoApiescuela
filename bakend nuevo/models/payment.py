# models/payment.py

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from config.db import Base   # ✅ solo Base, nada de get_db
import datetime


class Payment(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    id_usuarioxcarrera = Column(Integer, ForeignKey("usuarioxcarrera.id"), nullable=False)
    numero_cuota = Column(Integer, nullable=False)
    fecha_pago = Column(DateTime, default=datetime.datetime.utcnow)
    monto = Column(Integer, nullable=False)
    adelantado = Column(Boolean, default=False)
    anulado = Column(Boolean, default=False)

    # Relación con la tabla pivote
    usuarioxcarrera = relationship("UsuarioXcarrera", back_populates="pagos")

    def __init__(self, id_usuarioxcarrera, numero_cuota, monto, adelantado=False):
        self.id_usuarioxcarrera = id_usuarioxcarrera
        self.numero_cuota = numero_cuota
        self.monto = monto
        self.adelantado = adelantado
        self.fecha_pago = datetime.datetime.utcnow()
