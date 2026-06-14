/*
  Warnings:

  - Added the required column `email` to the `Zgloszenia` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Zgloszenia" DROP CONSTRAINT "Zgloszenia_user_id_fkey";

-- AlterTable
ALTER TABLE "Zgloszenia" ADD COLUMN     "email" VARCHAR NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Zgloszenia" ADD CONSTRAINT "Zgloszenia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
