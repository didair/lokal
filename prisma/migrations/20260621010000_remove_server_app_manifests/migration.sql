-- Move Lokal app data from predeclared server-side datasets to app-owned dynamic collections.
ALTER TABLE "DataRecord" ADD COLUMN "collection" TEXT;

UPDATE "DataRecord" AS dr
SET "collection" = ds."name"
FROM "AppDataset" AS ds
WHERE dr."datasetId" = ds."id";

UPDATE "DataRecord"
SET "collection" = 'default'
WHERE "collection" IS NULL;

ALTER TABLE "DataRecord" ALTER COLUMN "collection" SET NOT NULL;

ALTER TABLE "DataRecord" DROP CONSTRAINT IF EXISTS "DataRecord_datasetId_fkey";
DROP INDEX IF EXISTS "DataRecord_appId_datasetId_ownerId_key_key";
DROP INDEX IF EXISTS "DataRecord_appId_datasetId_ownerId_idx";

ALTER TABLE "DataRecord" DROP COLUMN "datasetId";

DROP TABLE IF EXISTS "AppDataset";

CREATE UNIQUE INDEX "DataRecord_appId_ownerId_collection_key_key" ON "DataRecord"("appId", "ownerId", "collection", "key");
CREATE INDEX "DataRecord_appId_ownerId_collection_idx" ON "DataRecord"("appId", "ownerId", "collection");
