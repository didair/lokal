-- Store the app-side defineLokalApp manifest sent during platform authentication.
ALTER TABLE "App" ADD COLUMN "manifest" JSONB;
