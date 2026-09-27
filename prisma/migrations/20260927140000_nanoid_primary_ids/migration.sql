PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TEMP TABLE "id_map" ("entity" TEXT NOT NULL, "oldId" TEXT NOT NULL, "newId" TEXT NOT NULL, PRIMARY KEY ("entity", "oldId"), UNIQUE ("entity", "newId"));
INSERT INTO "id_map" SELECT 'board', "id", "nanoid" FROM "board";
INSERT INTO "id_map"
SELECT 'app', a."id",
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1)
FROM "app" a;
INSERT INTO "id_map"
SELECT 'category', c."id",
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1) ||
  substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-', abs(random() % 64) + 1, 1)
FROM "board_category" c;
CREATE TEMP TABLE "id_map_collision_check" ("entity" TEXT NOT NULL, "valid" INTEGER NOT NULL CHECK ("valid" = 1));
INSERT INTO "id_map_collision_check"
SELECT 'app', CASE WHEN COUNT(*) = COUNT(DISTINCT "newId") AND COUNT(*) = (SELECT COUNT(*) FROM "app") THEN 1 ELSE 0 END FROM "id_map" WHERE "entity" = 'app';
INSERT INTO "id_map_collision_check"
SELECT 'category', CASE WHEN COUNT(*) = COUNT(DISTINCT "newId") AND COUNT(*) = (SELECT COUNT(*) FROM "board_category") THEN 1 ELSE 0 END FROM "id_map" WHERE "entity" = 'category';
DROP TABLE "id_map_collision_check";

CREATE TABLE "new_board" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "board_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "new_board_ownerId_id_key" ON "new_board"("ownerId", "id");
INSERT INTO "new_board" SELECT m."newId", b."name", b."ownerId", b."createdAt", b."updatedAt"
FROM "board" b JOIN "id_map" m ON m."entity"='board' AND m."oldId"=b."id";

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
INSERT INTO "new_app"
SELECT m."newId", a."ownerId", a."name", a."description", a."url", a."iconSource", a."iconSlug", a."customIconUrl", a."iconHash", a."status", a."lastCheckedAt", a."lastError", a."createdAt", a."updatedAt"
FROM "app" a JOIN "id_map" m ON m."entity"='app' AND m."oldId"=a."id";

CREATE TABLE "new_board_category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "boardId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "position" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "board_category_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_board_category"
SELECT cMap."newId", bMap."newId", c."title", c."description", c."position", c."createdAt", c."updatedAt"
FROM "board_category" c
JOIN "id_map" cMap ON cMap."entity"='category' AND cMap."oldId"=c."id"
JOIN "id_map" bMap ON bMap."entity"='board' AND bMap."oldId"=c."boardId";

CREATE TABLE "new_board_app" (
  "boardId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "categoryId" TEXT,
  "position" INTEGER NOT NULL,
  CONSTRAINT "board_app_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "board_app_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "board_app_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "board_category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  PRIMARY KEY ("boardId", "appId")
);
INSERT INTO "new_board_app"
SELECT bMap."newId", aMap."newId", cMap."newId", ba."position"
FROM "board_app" ba
JOIN "id_map" bMap ON bMap."entity"='board' AND bMap."oldId"=ba."boardId"
JOIN "id_map" aMap ON aMap."entity"='app' AND aMap."oldId"=ba."appId"
LEFT JOIN "id_map" cMap ON cMap."entity"='category' AND cMap."oldId"=ba."categoryId";

CREATE TABLE "new_user" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "image" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "defaultBoardId" TEXT,
  CONSTRAINT "user_email_key" UNIQUE ("email"),
  CONSTRAINT "user_defaultBoardId_fkey" FOREIGN KEY ("id", "defaultBoardId") REFERENCES "board" ("ownerId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_user" SELECT u."id", u."name", u."email", u."emailVerified", u."image", u."createdAt", u."updatedAt", bMap."newId"
FROM "user" u LEFT JOIN "id_map" bMap ON bMap."entity"='board' AND bMap."oldId"=u."defaultBoardId";

DROP TABLE "board_app";
DROP TABLE "board_category";
DROP TABLE "app";
DROP TABLE "board";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
ALTER TABLE "new_board" RENAME TO "board";
ALTER TABLE "new_app" RENAME TO "app";
ALTER TABLE "new_board_category" RENAME TO "board_category";
ALTER TABLE "new_board_app" RENAME TO "board_app";

CREATE INDEX "board_ownerId_createdAt_idx" ON "board"("ownerId", "createdAt");
CREATE UNIQUE INDEX "board_ownerId_id_key" ON "board"("ownerId", "id");
CREATE INDEX "app_iconSlug_idx" ON "app"("iconSlug");
CREATE INDEX "app_iconHash_idx" ON "app"("iconHash");
CREATE INDEX "app_ownerId_idx" ON "app"("ownerId");
CREATE UNIQUE INDEX "board_category_boardId_position_key" ON "board_category"("boardId", "position");
CREATE UNIQUE INDEX "board_category_boardId_title_key" ON "board_category"("boardId", "title");
CREATE INDEX "board_category_boardId_idx" ON "board_category"("boardId");
CREATE UNIQUE INDEX "board_app_boardId_position_key" ON "board_app"("boardId", "position");
CREATE INDEX "board_app_appId_idx" ON "board_app"("appId");
CREATE INDEX "board_app_categoryId_idx" ON "board_app"("categoryId");

DROP TABLE "id_map";
PRAGMA foreign_key_check;
COMMIT;
PRAGMA foreign_keys=ON;
