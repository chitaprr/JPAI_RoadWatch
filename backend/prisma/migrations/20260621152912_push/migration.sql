-- CreateTable
CREATE TABLE "PushSubscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endpoint" VARCHAR NOT NULL,
    "p256dh" VARCHAR NOT NULL,
    "auth" VARCHAR NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Potwierdzenia" (
    "id" SERIAL NOT NULL,
    "zgloszenie_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Potwierdzenia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscriptions_endpoint_key" ON "PushSubscriptions"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "Potwierdzenia_zgloszenie_id_user_id_key" ON "Potwierdzenia"("zgloszenie_id", "user_id");

-- AddForeignKey
ALTER TABLE "PushSubscriptions" ADD CONSTRAINT "PushSubscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Potwierdzenia" ADD CONSTRAINT "Potwierdzenia_zgloszenie_id_fkey" FOREIGN KEY ("zgloszenie_id") REFERENCES "Zgloszenia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Potwierdzenia" ADD CONSTRAINT "Potwierdzenia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
