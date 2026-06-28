FROM node:18 AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:${PATH}"

# Install python dependencies using uv
COPY pyproject.toml uv.lock ./
RUN uv pip install --system -r pyproject.toml
# Install newly added packages directly
RUN uv pip install --system scrapfly-sdk loguru

# Copy python app
COPY . .

# Copy built frontend
COPY --from=frontend-builder /app/dist /app/dist

EXPOSE 8000

CMD ["uvicorn", "app:asgi", "--host", "0.0.0.0", "--port", "8000"]
