from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from config.db import Base


# ==============================================
# MODELO: UsuarioXcarrera
# ==============================================
class UsuarioXcarrera(Base):
    __tablename__ = "usuarioxcarrera"

    id = Column(Integer, primary_key=True, index=True)
    id_userdetail = Column(Integer, ForeignKey("detalles_usuario.id"), nullable=False)
    id_carrera = Column(Integer, ForeignKey("carreras.id"), nullable=False)

    # Relaciones
    userdetail = relationship("UserDetail", back_populates="usuario_carrera")
    carrera = relationship("Career", back_populates="usuariosxcarrera")
    pagos = relationship("Payment", back_populates="usuarioxcarrera")

    def __init__(self, id_carrera, id_userdetail):
        self.id_carrera = id_carrera
        self.id_userdetail = id_userdetail
