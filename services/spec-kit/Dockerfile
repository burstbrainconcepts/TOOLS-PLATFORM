FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git curl  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# TODO: install github/spec-kit (uv tool install specify-cli) and serve specs/ docs here
CMD ["python", "server.py"]
