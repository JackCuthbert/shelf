ALTER TABLE "Instance" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'claimed';
ALTER TABLE "Instance" ADD COLUMN "token" TEXT NOT NULL DEFAULT 'legacy-claim';
CREATE UNIQUE INDEX "Instance_token_key" ON "Instance"("token");
