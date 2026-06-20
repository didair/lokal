# Lokal

## Overview
Simple self-host file sharing application for building your own Dropbox/Google Drive/ICloud Drive.
Point to the files you already have, where they already are located, Lokal stores additional information in its own postgres db.
This works great for e.g. exposing an entire user share from unraid.


![Files page preview](https://github.com/didair/lokal/blob/main/docs/lokal_screenshot.png)


## Prerequisites
- Docker
- Docker Compose

## Running this project

### Locally for development purposes

```sh
docker-compose -f docker-compose.dev.yml up --build -d
```

### Production use on a NAS

Production is intended to run from a prebuilt image, so the NAS does not need a copy of this repository.

1. Copy `docker-compose.yml` to the NAS.
2. Change the data volume from `/path/to/data:/data` to your real NAS data path.
3. If Lokal is served through a public domain or reverse proxy, set `LOKAL_PUBLIC_URL` in `docker-compose.yml`:

```yaml
environment:
  - LOKAL_PUBLIC_URL=https://files.skurt.cloud
```

This makes generated share and invite links use the public HTTPS URL instead of the container's local IP/port.

4. Start the stack:

```sh
docker compose pull
docker compose up -d
```

The app reads user files from `DATA_DIR`, which defaults to `/data` in the compose file. Keep the mounted files outside the app directory so Next.js does not scan a large NAS share while starting.

## Building and publishing the image manually

GitHub Actions is not required. Build and publish the multi-architecture image from your own machine with Docker Buildx.

### Publish to GHCR

Log in with a GitHub token that has package write access:

```sh
docker login ghcr.io
```

Create or select a Buildx builder:

```sh
docker buildx create --use
```

Build and push both common NAS/server architectures:

```sh
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f scripts/Dockerfile \
  -t ghcr.io/didair/lokal:latest \
  --push .
```

After publishing, the NAS can pull the image without needing the repo:

```sh
docker compose pull
docker compose up -d
```

If the GHCR package is private, run `docker login ghcr.io` on the NAS before pulling. If the package is public, no NAS login is needed.

### Optional: publish to Docker Hub instead

If you prefer Docker Hub, tag the image with your Docker Hub repository:

```sh
docker login

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f scripts/Dockerfile \
  -t your-dockerhub-username/lokal:latest \
  --push .
```

Then update `docker-compose.yml` to use that image name.
