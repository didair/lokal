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

Lokal can also act as a small app-private JSON data store for external self-hosted apps. This is intentionally not an app store or server runtime: apps run elsewhere, then use Lokal for user-bound API tokens and per-user data storage.

### Define an app manifest in the external app

External apps keep their schemas and TypeScript completions in their own code. At login time the app sends the same serializable shape to Lokal:

```ts
export const lokalManifest = defineLokalApp({
  slug: 'recipe-box',
  collections: {
    recipes: recipeSchema,
    settings: settingsSchema,
  },
});
```

Collection names become app-private namespaces. Two apps can both use a `recipes` collection without seeing each other's records.

### Authenticate and register the app

When a member, admin, or owner signs in successfully through the platform auth endpoint, Lokal commits the manifest and returns a user-bound app token. No owner/admin pre-registration is required.

```sh
curl -X POST "https://files.example.com/api/platform/auth" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "password":"correct horse battery staple",
    "manifest":{
      "slug":"recipe-box",
      "collections":{
        "recipes":{"title":"string","body":"string","tags":["string"]},
        "settings":{"theme":"string"}
      }
    }
  }'
```

The response contains `token.rawToken`. Store it in the external app and send it as a bearer token for data calls:

```json
{
  "apiBase": "https://files.example.com/api/platform",
  "app": { "slug": "recipe-box" },
  "token": {
    "type": "Bearer",
    "rawToken": "lokal_app_...",
    "scopes": ["data:read", "data:write"]
  }
}
```

Owners/admins can still view registered apps and active tokens in **Settings → Apps**. That list will move to a dedicated app page later.

### API discovery

External apps can read this endpoint to find the instance API base, supported features, and contract URLs:

```sh
curl https://files.example.com/.well-known/lokal
```

The response includes links to:

- `/contracts/openapi.json`
- `/contracts/lokal-manifest.schema.json`

SDK repositories should consume those contracts or pin to the same files from a tagged Lokal release.

### Collection records API

```sh
TOKEN="lokal_app_..."
BASE="https://files.example.com/api/platform/apps/recipe-box/collections/recipes"

curl -H "Authorization: Bearer $TOKEN" "$BASE/records"

curl -X POST "$BASE/records" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":{"title":"Pancakes","body":"Mix and fry"}}'
```

Records can be read, updated, and soft-deleted at `/records/:recordId` with `GET`, `PATCH`, and `DELETE`.

### Singleton value API

Use `/value` when an app wants one value for a collection, such as settings or preferences:

```sh
TOKEN="lokal_app_..."
BASE="https://files.example.com/api/platform/apps/recipe-box/collections/settings"

curl -X PUT "$BASE/value" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value":{"theme":"dark"}}'

curl -H "Authorization: Bearer $TOKEN" "$BASE/value"
```

### Contract drift checks

Lokal keeps the SDK-facing API contract in `contracts/`. The build runs `npm run contracts:check`, which compares implemented platform routes with `contracts/openapi.json`. If an endpoint is added, removed, or changes HTTP methods without updating the contract, the build fails.

Breaking API changes should update `contracts/openapi.json` and bump its `info.version` so SDK repos can pin or regenerate safely.

### Current limitations

- App authentication uses Lokal user email/password directly for now; a consent/OAuth-style flow can be added later.
- Tokens are bound to the Lokal user who authenticates, so data is private to that user and app.
- Lokal stores the submitted manifest for visibility but still treats record values as opaque JSON.
- Files are intentionally not exposed through the app API yet.
