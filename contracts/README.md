# Lokal contracts

This folder is the source of truth for external SDKs.

- `openapi.json` describes the Lokal Platform REST API.
- `lokal-manifest.schema.json` describes the serializable shape sent from `defineLokalApp(...)` during platform authentication.

## How SDK repos should consume this

SDK repos can discover contracts from a running Lokal instance:

```sh
curl https://files.example.com/.well-known/lokal
curl -O https://files.example.com/contracts/openapi.json
curl -O https://files.example.com/contracts/lokal-manifest.schema.json
```

They can also fetch these files from a tagged Lokal release or from `main` while developing:

```sh
curl -O https://raw.githubusercontent.com/didair/lokal/main/contracts/openapi.json
curl -O https://raw.githubusercontent.com/didair/lokal/main/contracts/lokal-manifest.schema.json
```

A TypeScript SDK should generate low-level REST types from `openapi.json`, then wrap them in hand-written DX around the app manifest.

## Endpoint changes

When a platform endpoint is added, removed, or has its HTTP methods changed, update `openapi.json` in the same commit.

`npm run contracts:check` scans the implemented Next.js platform routes and fails if they drift from `openapi.json`.

Breaking changes should bump `info.version` in `openapi.json` and should be released under a git tag so SDKs can pin to a known contract.

## Automatic drift handling

The Lokal build runs `npm run contracts:check` before `next build`.

The check scans implemented routes under:

- `app/api/platform/**/route.ts`
- `app/.well-known/lokal/route.ts`

It compares implemented HTTP methods with `contracts/openapi.json`. If a route is added, removed, or changes methods without updating OpenAPI, the build fails.

This does not replace semantic API review. If request/response shapes change, update OpenAPI in the same commit and bump `info.version` for breaking changes.
