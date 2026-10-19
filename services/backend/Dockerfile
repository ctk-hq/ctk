FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && \
    groupadd --gid 1000 appuser && useradd --uid 1000 --gid appuser --create-home appuser
COPY --chown=appuser:appuser src/ /app/
USER appuser
EXPOSE 9001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9001", "--proxy-headers", "--forwarded-allow-ips", "*"]
