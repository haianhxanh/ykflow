/*
  Warnings:

  - Changed the type of `new_start_date` on the `Request` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `new_end_date` on the `Request` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Request" ALTER COLUMN "pause_start_date" SET DATA TYPE DATE,
ALTER COLUMN "pause_end_date" SET DATA TYPE DATE,
DROP COLUMN "new_start_date",
ADD COLUMN     "new_start_date" DATE NOT NULL,
DROP COLUMN "new_end_date",
ADD COLUMN     "new_end_date" DATE NOT NULL;
