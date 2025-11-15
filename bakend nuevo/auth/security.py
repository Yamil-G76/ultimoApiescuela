import jwt
import datetime
from fastapi import Request, HTTPException, status

# Clave secreta y algoritmo del token
SECRET_KEY = "dev_secret_key_for_testing_only"
ALGORITHM = "HS256"


class Security:
    # =========================================
    #  Generar token con datos de usuario
    # =========================================
    @staticmethod
    def generate_token(usuario: dict):
        """
        usuario = {
            "idusuario": int,
            "usuario": str,
            "type": str  # admin o alumno
        }
        """
        try:
            payload = {
                "sub": usuario["usuario"],
                "id": usuario["idusuario"],
                "rol": usuario["type"],
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8),
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
            return token
        except Exception as e:
            print("Error al generar token:", e)
            return None

    # =========================================
    #  Verificar y decodificar token JWT
    # =========================================
    @staticmethod
    def verify_token(token: str):
        try:
            decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return decoded
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado.",
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido.",
            )

    # =========================================
    #  Obtener usuario logueado desde request
    # =========================================
    @staticmethod
    async def get_current_user(request: Request):
        """
        Extrae y valida el token JWT del encabezado Authorization.
        Devuelve los datos del usuario (id, usuario, rol).
        """
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token no proporcionado.",
            )

        token = auth_header.split(" ")[1]
        user_data = Security.verify_token(token)
        return user_data

    # =========================================
    #  Verificar rol (admin / alumno)
    # =========================================
    @staticmethod
    def check_role(user_data: dict, rol_requerido: str):
        """
        Verifica si el usuario tiene el rol necesario.
        Ejemplo:
            Security.check_role(usuario, "admin")
        """
        if user_data.get("rol") != rol_requerido:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso restringido a usuarios con rol '{rol_requerido}'.",
            )
