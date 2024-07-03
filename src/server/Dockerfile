# Use the official Python image from the Docker Hub.
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install Poetry
RUN pip install poetry

# Install dependencies defined in pyproject.toml
RUN poetry install --no-root

# Run the FastAPI server on container start
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
