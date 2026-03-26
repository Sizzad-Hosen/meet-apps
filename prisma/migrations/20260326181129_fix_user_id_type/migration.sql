/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('waiting', 'active', 'ended');

-- CreateEnum
CREATE TYPE "MeetingType" AS ENUM ('instant', 'scheduled');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('host', 'cohost', 'guest');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('waiting', 'admitted', 'denied', 'left');

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "join_code" VARCHAR(12) NOT NULL,
    "host_id" UUID NOT NULL,
    "livekit_room_name" TEXT NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'waiting',
    "type" "MeetingType" NOT NULL DEFAULT 'instant',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "waiting_room_on" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" TEXT,
    "max_participants" INTEGER NOT NULL DEFAULT 100,
    "allow_screenshare" BOOLEAN NOT NULL DEFAULT true,
    "screenshare_needs_approval" BOOLEAN NOT NULL DEFAULT false,
    "is_recorded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" UUID NOT NULL,
    "meeting_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'guest',
    "status" "ParticipantStatus" NOT NULL DEFAULT 'waiting',
    "livekit_token" TEXT,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "is_video_off" BOOLEAN NOT NULL DEFAULT false,
    "is_screen_sharing" BOOLEAN NOT NULL DEFAULT false,
    "hand_raised" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meetings_join_code_key" ON "meetings"("join_code");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_livekit_room_name_key" ON "meetings"("livekit_room_name");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meeting_id_user_id_key" ON "meeting_participants"("meeting_id", "user_id");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
