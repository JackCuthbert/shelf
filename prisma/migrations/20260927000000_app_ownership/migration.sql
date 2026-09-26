PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_app" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "app_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_app" ("id", "ownerId", "name", "description", "url", "iconSource", "iconSlug", "customIconUrl", "iconHash", "status", "lastCheckedAt", "lastError", "createdAt", "updatedAt")
SELECT a."id",
       COALESCE(
           (SELECT b."ownerId" FROM "board_app" ba JOIN "board" b ON b."id" = ba."boardId" WHERE ba."appId" = a."id" ORDER BY b."createdAt", b."id" LIMIT 1),
           (SELECT u."id" FROM "user" u ORDER BY u."createdAt", u."id" LIMIT 1)
       ),
       a."name", a."description", a."url", a."iconSource", a."iconSlug", a."customIconUrl", a."iconHash", a."status", a."lastCheckedAt", a."lastError", a."createdAt", a."updatedAt"
FROM "app" a;

DROP TABLE "app";
ALTER TABLE "new_app" RENAME TO "app";
CREATE INDEX "app_iconSlug_idx" ON "app"("iconSlug");
CREATE INDEX "app_iconHash_idx" ON "app"("iconHash");
CREATE INDEX "app_ownerId_idx" ON "app"("ownerId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
