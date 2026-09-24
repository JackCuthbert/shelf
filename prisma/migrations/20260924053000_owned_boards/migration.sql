CREATE TABLE "board" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "nanoid" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "board_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "board_nanoid_key" ON "board"("nanoid");
CREATE INDEX "board_ownerId_createdAt_idx" ON "board"("ownerId", "createdAt");
CREATE TABLE "board_app" (
  "boardId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "board_app_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "board_app_appId_fkey" FOREIGN KEY ("appId") REFERENCES "app" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("boardId", "appId")
);
CREATE UNIQUE INDEX "board_app_boardId_position_key" ON "board_app"("boardId", "position");
CREATE INDEX "board_app_appId_idx" ON "board_app"("appId");
ALTER TABLE "user" ADD COLUMN "defaultBoardId" TEXT;
