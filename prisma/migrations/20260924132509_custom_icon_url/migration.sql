-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_app" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "iconSource" TEXT NOT NULL DEFAULT 'dashboard',
    "iconSlug" TEXT,
    "customIconUrl" TEXT,
    "iconHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "lastCheckedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_app" ("createdAt", "description", "iconSlug", "id", "lastCheckedAt", "lastError", "name", "status", "updatedAt", "url") SELECT "createdAt", "description", "iconSlug", "id", "lastCheckedAt", "lastError", "name", "status", "updatedAt", "url" FROM "app";
DROP TABLE "app";
ALTER TABLE "new_app" RENAME TO "app";
CREATE INDEX "app_iconSlug_idx" ON "app"("iconSlug");
CREATE INDEX "app_iconHash_idx" ON "app"("iconHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
