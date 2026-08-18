# Frontend build
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
ENV VITE_BACKEND_URL=
RUN npm run build

# Backend + static assets
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
COPY --from=frontend-build /app/frontend/dist ./static
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]
