-- CreateEnum
CREATE TYPE "Rola" AS ENUM ('MIESZKANIEC', 'URZEDNIK', 'WYKONAWCA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Rola" NOT NULL DEFAULT 'MIESZKANIEC',
ADD COLUMN     "wykonawca_id" INTEGER;

-- AlterTable
ALTER TABLE "Zgloszenia" ADD COLUMN     "gmina_id" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_wykonawca_id_fkey" FOREIGN KEY ("wykonawca_id") REFERENCES "Wykonawcy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zgloszenia" ADD CONSTRAINT "Zgloszenia_gmina_id_fkey" FOREIGN KEY ("gmina_id") REFERENCES "Gminy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
