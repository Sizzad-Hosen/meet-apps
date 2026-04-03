-- CreateTable
CREATE TABLE "screenShare" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screenShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "screenShare_meeting_id_idx" ON "screenShare"("meeting_id");

-- CreateIndex
CREATE INDEX "screenShare_user_id_idx" ON "screenShare"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "screenShare_meeting_id_user_id_key" ON "screenShare"("meeting_id", "user_id");

-- AddForeignKey
ALTER TABLE "screenShare" ADD CONSTRAINT "screenShare_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screenShare" ADD CONSTRAINT "screenShare_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
