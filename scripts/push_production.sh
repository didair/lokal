#!/bin/sh
set -e

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f scripts/Dockerfile \
  -t ghcr.io/didair/lokal:latest \
  --push .