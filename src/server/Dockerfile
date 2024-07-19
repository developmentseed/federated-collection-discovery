FROM python:3.12-slim

WORKDIR /app

RUN pip install poetry

COPY ./pyproject.toml /app/
COPY ./app /app/

RUN poetry install --no-root

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
