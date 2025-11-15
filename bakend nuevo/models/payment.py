from sqlalchemy import Column, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from config.db import Base
import datetime


# ==============================================
# MODELO: Payment (Pagos de alumno por carrera)
# ==============================================
class Payment(Base):
    __tablename__ = "pagos"

    id = Column(Integer, primary_key=True, index=True)
    id_usuarioxcarrera = Column(Integer, ForeignKey("usuarioxcarrera.id"), nullable=False)
    numero_cuota = Column(Integer, nullable=False)          # Cuota N° (1, 2, 3, ...)
    fecha_pago = Column(DateTime, default=datetime.datetime.utcnow)
    monto = Column(Integer, nullable=False)
    adelantado = Column(Boolean, default=False)             # Permite pagos adelantados
    anulado = Column(Boolean, default=False)                # Si el pago fue cancelado manualmente

    # Relación con la tabla pivote
    usuarioxcarrera = relationship("UsuarioXcarrera", back_populates="pagos")

    def __init__(self, id_usuarioxcarrera, numero_cuota, monto, adelantado=False):
        self.id_usuarioxcarrera = id_usuarioxcarrera
        self.numero_cuota = numero_cuota
        self.monto = monto
        self.adelantado = adelantado
        self.fecha_pago = datetime.datetime.utcnow()
