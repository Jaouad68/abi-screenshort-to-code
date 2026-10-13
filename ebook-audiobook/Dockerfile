# Image pour la version en ligne (Hugging Face Spaces ou tout hébergeur Docker).
FROM python:3.12-slim

# Hugging Face exige un utilisateur non-root d'identifiant 1000.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    AUDIOBOOK_DATA_DIR=/home/user/data \
    AUDIOBOOK_PIPER_VOICES=/home/user/voices \
    AUDIOBOOK_HOSTED=1
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .
# Voix Piper intégrées à l'image : le mode hors ligne marche dès le démarrage.
RUN python scripts/download_voices.py

EXPOSE 7860
CMD ["uvicorn", "app.server:app", "--host", "0.0.0.0", "--port", "7860"]
