/*
  Warnings:

  - You are about to drop the column `gmina_id` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_gmina_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "gmina_id",
ADD COLUMN     "admin_gmina_id" INTEGER,
ADD COLUMN     "urzednik_gmina_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_urzednik_gmina_id_fkey" FOREIGN KEY ("urzednik_gmina_id") REFERENCES "Gminy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_admin_gmina_id_fkey" FOREIGN KEY ("admin_gmina_id") REFERENCES "Gminy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
