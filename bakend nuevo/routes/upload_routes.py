# routes/upload_routes.py

from fastapi import APIRouter, UploadFile, File
import shutil
import uuid
import os

router = APIRouter()

UPLOAD_DIR = "static/news_images"

@router.post("/upload")
def upload_image(file: UploadFile = File(...)):
    # Crear nombre único
    file_extension = file.filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{file_extension}"
    save_path = os.path.join(UPLOAD_DIR, new_filename)

    # Guardar archivo
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # URL pública
    url = f"/static/news_images/{new_filename}"

    return {
        "success": True,
        "url": url
    }
