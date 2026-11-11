FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git curl android-tools-adb && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# TODO: install google/artemis per its README; it needs an ADB-reachable device/emulator
CMD ["python", "server.py"]
