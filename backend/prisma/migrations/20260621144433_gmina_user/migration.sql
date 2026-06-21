-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gmina_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gmina_id_fkey" FOREIGN KEY ("gmina_id") REFERENCES "Gminy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
