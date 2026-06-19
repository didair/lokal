#!/bin/sh
set -e

# Run Prisma migrations if the environment variable is set.
# The Next.js app is built into the image, before any large data volume is mounted.
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "### 1. Waiting 5s before running prisma migrate ###"
  sleep 5s
  npx prisma migrate deploy
  echo "### 2. Migrate script done ###"
else
  echo "### Skipping Prisma migrations ###"
fi

# Start the application
exec "$@"
