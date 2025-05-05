-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "order_name" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_email" TEXT NOT NULL,
    "pause_start_date" TIMESTAMP(3) NOT NULL,
    "pause_end_date" TIMESTAMP(3) NOT NULL,
    "item_title" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "new_start_date" TEXT NOT NULL,
    "new_end_date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request_date" TIMESTAMP(3) NOT NULL,
    "merchant_note" TEXT NOT NULL,
    "user_note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
