-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_chat_threads" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_chat_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_reads" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "direct_chat_threads_userAId_idx" ON "direct_chat_threads"("userAId");

-- CreateIndex
CREATE INDEX "direct_chat_threads_userBId_idx" ON "direct_chat_threads"("userBId");

-- CreateIndex
CREATE UNIQUE INDEX "direct_chat_threads_userAId_userBId_key" ON "direct_chat_threads"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "direct_chat_messages_threadId_idx" ON "direct_chat_messages"("threadId");

-- CreateIndex
CREATE INDEX "direct_chat_messages_senderId_idx" ON "direct_chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "direct_chat_messages_createdAt_idx" ON "direct_chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "chat_room_reads_roomId_idx" ON "chat_room_reads"("roomId");

-- CreateIndex
CREATE INDEX "chat_room_reads_userId_idx" ON "chat_room_reads"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_reads_roomId_userId_key" ON "chat_room_reads"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_chat_threads" ADD CONSTRAINT "direct_chat_threads_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_chat_threads" ADD CONSTRAINT "direct_chat_threads_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_chat_messages" ADD CONSTRAINT "direct_chat_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "direct_chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_chat_messages" ADD CONSTRAINT "direct_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_reads" ADD CONSTRAINT "chat_room_reads_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_reads" ADD CONSTRAINT "chat_room_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
