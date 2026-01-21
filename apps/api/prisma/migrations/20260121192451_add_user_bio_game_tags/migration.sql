-- Add bio and game tags to users
ALTER TABLE "users"
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "gameTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];