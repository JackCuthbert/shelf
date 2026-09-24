/*
  Warnings:

  - A unique constraint covering the columns `[ownerId,id]` on the table `board` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "board_category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "board_category_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Instance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL DEFAULT 'claiming',
    "token" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Instance" ("claimedAt", "id", "state", "token") SELECT "claimedAt", "id", "state", "token" FROM "Instance";
DROP TABLE "Instance";
ALTER TABLE "new_Instance" RENAME TO "Instance";
CREATE UNIQUE INDEX "Instance_token_key" ON "Instance"("token");
CREATE TABLE "new_board_app" (
    "boardId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "categoryId" TEXT,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("boardId", "appId"),
    CONSTRAINT "board_app_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "board_app_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "board_app_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "board_category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_board_app" ("appId", "boardId", "position") SELECT "appId", "boardId", "position" FROM "board_app";
DROP TABLE "board_app";
ALTER TABLE "new_board_app" RENAME TO "board_app";
CREATE INDEX "board_app_appId_idx" ON "board_app"("appId");
CREATE INDEX "board_app_categoryId_idx" ON "board_app"("categoryId");
CREATE UNIQUE INDEX "board_app_boardId_position_key" ON "board_app"("boardId", "position");
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "defaultBoardId" TEXT,
    CONSTRAINT "user_id_defaultBoardId_fkey" FOREIGN KEY ("id", "defaultBoardId") REFERENCES "board" ("ownerId", "id") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_user" ("createdAt", "defaultBoardId", "email", "emailVerified", "id", "image", "name", "updatedAt") SELECT "createdAt", "defaultBoardId", "email", "emailVerified", "id", "image", "name", "updatedAt" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "board_category_boardId_idx" ON "board_category"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "board_category_boardId_position_key" ON "board_category"("boardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "board_category_boardId_title_key" ON "board_category"("boardId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "board_ownerId_id_key" ON "board"("ownerId", "id");
