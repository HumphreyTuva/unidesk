-- Students can read every page in the app; the PDF itself stays private and is only given out on download.
ALTER TABLE "Paper" ADD COLUMN "pageCount" INTEGER NOT NULL DEFAULT 0;
