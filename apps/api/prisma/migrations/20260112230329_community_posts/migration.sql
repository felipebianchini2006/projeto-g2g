-- CreateTable
CREATE TABLE "community_posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "couponCode" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX "community_posts_pinned_idx" ON "community_posts"("pinned");

-- CreateIndex
CREATE INDEX "community_posts_createdAt_idx" ON "community_posts"("createdAt");

-- CreateIndex
CREATE INDEX "community_post_likes_postId_idx" ON "community_post_likes"("postId");

-- CreateIndex
CREATE INDEX "community_post_likes_userId_idx" ON "community_post_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_likes_postId_userId_key" ON "community_post_likes"("postId", "userId");

-- CreateIndex
CREATE INDEX "community_post_comments_postId_idx" ON "community_post_comments"("postId");

-- CreateIndex
CREATE INDEX "community_post_comments_userId_idx" ON "community_post_comments"("userId");

-- CreateIndex
CREATE INDEX "community_post_comments_createdAt_idx" ON "community_post_comments"("createdAt");

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_comments" ADD CONSTRAINT "community_post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_comments" ADD CONSTRAINT "community_post_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
