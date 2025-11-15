from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from config.db import Base

# ==============================================
# MODELO: Usuario
# ==============================================
class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)  # sin encriptar por ahora

    # Relación uno a uno con detalle
    userdetail = relationship("UserDetail", uselist=False, back_populates="user")

    def __init__(self, username, password):
        self.username = username
        self.password = password


# ==============================================
# MODELO: Detalle del Usuario
# ==============================================
class UserDetail(Base):
    __tablename__ = "detalles_usuario"

    id = Column(Integer, primary_key=True, index=True)
    id_user = Column(Integer, ForeignKey("usuarios.id"))
    first_name = Column(String(50))
    last_name = Column(String(50))
    dni = Column(String(20), unique=True)
    email = Column(String(100))
    type = Column(String(20))  # Ej: "admin" o "alumno"

    # Relaciones ORM
    user = relationship("User", back_populates="userdetail")
    usuario_carrera = relationship("UsuarioXcarrera", back_populates="userdetail")

    def __init__(self, first_name, last_name, dni, email, type):
        self.first_name = first_name
        self.last_name = last_name
        self.dni = dni
        self.email = email
        self.type = type
