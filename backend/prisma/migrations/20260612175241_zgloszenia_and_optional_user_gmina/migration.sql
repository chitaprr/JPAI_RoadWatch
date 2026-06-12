-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gmina_id" INTEGER;

-- CreateTable
CREATE TABLE "Gminy" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "Gminy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wykonawcy" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "gmina_id" INTEGER NOT NULL,
    "nip" VARCHAR NOT NULL,

    CONSTRAINT "Wykonawcy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zgloszenia" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "urzednik_id" INTEGER,
    "contractor_id" INTEGER,
    "title" VARCHAR NOT NULL,
    "description" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "status" VARCHAR NOT NULL DEFAULT 'Nowe',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" DATE,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "Zgloszenia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zdjecia" (
    "id" SERIAL NOT NULL,
    "zgloszenie_id" INTEGER NOT NULL,
    "file_path" VARCHAR NOT NULL,
    "uploaded_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zdjecia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Naprawy" (
    "id" SERIAL NOT NULL,
    "zadanie_id" INTEGER NOT NULL,
    "contractor_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "completed_at" TIMESTAMP NOT NULL,

    CONSTRAINT "Naprawy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NaprawyZdjecia" (
    "id" SERIAL NOT NULL,
    "naprawa_id" INTEGER NOT NULL,
    "file_path" VARCHAR NOT NULL,

    CONSTRAINT "NaprawyZdjecia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gmina_id_fkey" FOREIGN KEY ("gmina_id") REFERENCES "Gminy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wykonawcy" ADD CONSTRAINT "Wykonawcy_gmina_id_fkey" FOREIGN KEY ("gmina_id") REFERENCES "Gminy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zgloszenia" ADD CONSTRAINT "Zgloszenia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zgloszenia" ADD CONSTRAINT "Zgloszenia_urzednik_id_fkey" FOREIGN KEY ("urzednik_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zgloszenia" ADD CONSTRAINT "Zgloszenia_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "Wykonawcy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zdjecia" ADD CONSTRAINT "Zdjecia_zgloszenie_id_fkey" FOREIGN KEY ("zgloszenie_id") REFERENCES "Zgloszenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Naprawy" ADD CONSTRAINT "Naprawy_zadanie_id_fkey" FOREIGN KEY ("zadanie_id") REFERENCES "Zgloszenia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Naprawy" ADD CONSTRAINT "Naprawy_contractor_id_fkey" FOREIGN KEY ("contractor_id") REFERENCES "Wykonawcy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NaprawyZdjecia" ADD CONSTRAINT "NaprawyZdjecia_naprawa_id_fkey" FOREIGN KEY ("naprawa_id") REFERENCES "Naprawy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
