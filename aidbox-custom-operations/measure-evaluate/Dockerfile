FROM python:3.11-slim

WORKDIR /app

COPY app/requirements.txt app/requirements.txt
RUN pip install --no-cache-dir -r app/requirements.txt

COPY app/ app/
COPY sql/ sql/
COPY data/ data/
COPY demo/ demo/
COPY service/measures-registry.json service/measures-registry.json
# Theme assets live at the repo root; app.html references them as ../*.
COPY light-theme.css dark-theme.css theme-toggle.js ./

ENV REPO_ROOT=/app

EXPOSE 8090

CMD ["python", "app/app.py"]
