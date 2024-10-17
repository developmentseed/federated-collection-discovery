FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY README.md pyproject.toml uv.lock ./
COPY federated_collection_discovery/ ./federated_collection_discovery/

RUN uv sync --frozen --extra uvicorn

ENV HOST 0.0.0.0
ENV PORT 80
CMD uv run uvicorn federated_collection_discovery.main:app --host ${HOST} --port ${PORT} --log-level debug

