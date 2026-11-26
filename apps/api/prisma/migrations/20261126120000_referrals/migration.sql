-- Invite a friend: each student gets a personal code, and a new account remembers who invited it.
ALTER TABLE "User" ADD COLUMN "refCode" TEXT;
ALTER TABLE "User" ADD COLUMN "referredById" TEXT;
CREATE UNIQUE INDEX "User_refCode_key" ON "User"("refCode");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
