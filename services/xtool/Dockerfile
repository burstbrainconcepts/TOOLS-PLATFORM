FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git curl  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
# TODO: xtool needs Swift + Apple's Xcode.xip (not committable); build on a WSL2/Linux machine, see README
CMD ["python", "server.py"]
