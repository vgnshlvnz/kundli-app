# The FastAPI backend (modules/api and everything it imports) as a linux/amd64 image
# for Cloudflare Containers. deploy/cloudflare/ builds and deploys it; see README.md.
#
#   docker build --target test .   # run the full Python test suite inside the runtime image
#   docker build .                 # the image that is deployed (last stage)
#
# The source tree keeps the repository layout under /app and the workspace
# members are installed editable, so the paths the modules resolve from their
# own files (data/, the bundled .se1 files) are the same as in a checkout.

ARG PYTHON_IMAGE=python:3.12-slim
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.13.8

FROM ${UV_IMAGE} AS uv

# pyswisseph has no cp312 wheel on PyPI, so it is compiled here.
FROM ${PYTHON_IMAGE} AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /app
COPY . .
RUN uv sync --locked --no-dev --package kundli-api

# Runtime: no compiler, no uv, unprivileged user. zoneinfo reads the image's
# tzdata package (Debian builds it with the pre-1970 backzone history the
# timezone tests pin).
FROM ${PYTHON_IMAGE} AS runtime
RUN useradd --system --no-create-home --uid 10001 kundli
COPY --from=build /app /app
WORKDIR /app
ENV PATH=/app/.venv/bin:$PATH PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER kundli
EXPOSE 8080
CMD ["uvicorn", "kundli_api.app:app", "--host", "0.0.0.0", "--port", "8080", "--no-access-log"]

# The whole test suite and the module check, run in the runtime image.
FROM runtime AS test
USER root
COPY --from=uv /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never UV_PROJECT_ENVIRONMENT=/app/.venv
RUN uv sync --locked --all-packages \
 && uv run --no-sync python tools/check_modules.py \
 && uv run --no-sync pytest -q -p no:cacheprovider

# Last stage = the image `wrangler deploy` builds.
FROM runtime
