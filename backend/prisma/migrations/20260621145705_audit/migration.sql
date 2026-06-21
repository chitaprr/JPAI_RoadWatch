-- CreateTable
CREATE TABLE "Komentarze" (
    "id" SERIAL NOT NULL,
    "zgloszenie_id" INTEGER NOT NULL,
    "author_id" INTEGER,
    "author_name" VARCHAR NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Komentarze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriaZmian" (
    "id" SERIAL NOT NULL,
    "zgloszenie_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "user_name" VARCHAR NOT NULL,
    "field" VARCHAR NOT NULL,
    "old_value" VARCHAR,
    "new_value" VARCHAR,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriaZmian_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Komentarze" ADD CONSTRAINT "Komentarze_zgloszenie_id_fkey" FOREIGN KEY ("zgloszenie_id") REFERENCES "Zgloszenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Komentarze" ADD CONSTRAINT "Komentarze_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaZmian" ADD CONSTRAINT "HistoriaZmian_zgloszenie_id_fkey" FOREIGN KEY ("zgloszenie_id") REFERENCES "Zgloszenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaZmian" ADD CONSTRAINT "HistoriaZmian_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
