-- A student's school: saved on their account and on each paper request.
ALTER TABLE "User" ADD COLUMN "school" TEXT;
ALTER TABLE "PaperRequest" ADD COLUMN "school" TEXT;
