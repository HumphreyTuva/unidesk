-- The same unit can have different codes in different schools (for example SMA300 and SMA310). A paper lists the other codes it answers to.
ALTER TABLE "Paper" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
