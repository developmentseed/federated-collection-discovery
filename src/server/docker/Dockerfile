# Based on https://github.com/michaeloliverx/python-poetry-docker-example/blob/master/docker/Dockerfile
# Uses multi-stage builds requiring Docker 17.05 or higher
# See https://docs.docker.com/develop/develop-images/multistage-build/

ARG PYTHON_VERSION=3.12
ARG POETRY_VERSION=1.8.3

# Creating a python base with shared environment variables
FROM python:${PYTHON_VERSION}-slim AS python-base
ENV PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1 \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  POETRY_HOME="/opt/poetry" \
  POETRY_VIRTUALENVS_IN_PROJECT=true \
  POETRY_NO_INTERACTION=1 \
  PYSETUP_PATH="/opt/pysetup" \
  VENV_PATH="/opt/pysetup/.venv"

ENV PATH="$POETRY_HOME/bin:$VENV_PATH/bin:$PATH"


# builder-base is used to build dependencies
FROM python-base AS builder-base
RUN apt-get update \
  && apt-get install --no-install-recommends -y \
  curl \
  build-essential

# Install Poetry - respects $POETRY_VERSION & $POETRY_HOME
RUN curl -sSL https://install.python-poetry.org | python3 -

# We copy our Python requirements here to cache them
# and install only runtime deps using poetry
WORKDIR $PYSETUP_PATH
COPY ./poetry.lock ./pyproject.toml ./
RUN poetry install --no-root --no-dev


# 'local' stage installs all dev deps and can be used to develop code.
# For example using docker-compose to mount local volume under /app
FROM python-base AS local
ENV FASTAPI_ENV=local

# Copying poetry and venv into image
COPY --from=builder-base $POETRY_HOME $POETRY_HOME
COPY --from=builder-base $PYSETUP_PATH $PYSETUP_PATH

# Copying in our entrypoint
COPY ./docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# venv already has runtime deps installed we get a quicker install
# WORKDIR $PYSETUP_PATH
# RUN poetry install

WORKDIR /work

COPY ./poetry.lock ./pyproject.toml ./
# will get overwritten by mounted vol if you run with docker compose
# note: not re-installing since we already have the runtime deps from builder-base
COPY ./federated_collection_discovery ./federated_collection_discovery/ 

EXPOSE 8000
ENTRYPOINT /docker-entrypoint.sh $0 $@
CMD ["poetry", "run", "uvicorn", "federated_collection_discovery.main:app", "--host=0.0.0.0", "--port=8000", "--reload"]

