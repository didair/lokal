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
  - LOKAL_PUBLIC_URL=https://lokal.mydomain.com
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

## Lokal Apps developer preview

Lokal can also act as a small app-private data store for external self-hosted apps. This is intentionally not an app store or server runtime: apps run elsewhere, then use Lokal for authentication-adjacent, per-user JSON data storage.

### Register an app

1. Open **Settings → Apps** as an owner or admin.
2. Paste an app manifest and click **Register / update app**.
3. Create a token and copy it immediately. Lokal stores only the token hash.

Example manifest:

```json
{
  "name": "Recipe Box",
  "slug": "recipe-box",
  "description": "Stores private recipe data in Lokal.",
  "developerName": "Example Dev",
  "datasets": [
    {
      "name": "recipes",
      "kind": "collection",
      "schema": { "title": "string", "body": "string", "tags": ["string"] }
    },
    {
      "name": "settings",
      "kind": "singleton",
      "schema": { "theme": "string" }
    }
  ]
}
```

### API discovery

External apps can read this endpoint to find the instance API base:

```sh
curl https://files.example.com/.well-known/lokal
```

### Collection dataset API

```sh
TOKEN="lokal_app_..."
BASE="https://files.example.com/api/platform/apps/recipe-box/datasets/recipes"

curl -H "Authorization: Bearer $TOKEN" "$BASE/records"

curl -X POST "$BASE/records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":{"title":"Pancakes","body":"Mix and fry"}}'
```

Records can be read, updated, and soft-deleted at `/records/:recordId` with `GET`, `PATCH`, and `DELETE`.

### Singleton dataset API

```sh
TOKEN="lokal_app_..."
BASE="https://files.example.com/api/platform/apps/recipe-box/datasets/settings"

curl -X PUT "$BASE/value" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":{"theme":"dark"}}'

curl -H "Authorization: Bearer $TOKEN" "$BASE/value"
```

### Current limitations

- Only owners/admins can register apps and create app tokens.
- Tokens are bound to the Lokal user who creates them, so data is private to that user and app.
- App manifests are descriptive; Lokal stores the schema but does not enforce validation yet.
- Files are intentionally not exposed through the app API yet.
