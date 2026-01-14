-- CreateTable
CREATE TABLE "listing_questions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "askedById" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_questions_listingId_idx" ON "listing_questions"("listingId");

-- CreateIndex
CREATE INDEX "listing_questions_askedById_idx" ON "listing_questions"("askedById");

-- CreateIndex
CREATE INDEX "listing_questions_answeredById_idx" ON "listing_questions"("answeredById");

-- AddForeignKey
ALTER TABLE "listing_questions" ADD CONSTRAINT "listing_questions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_questions" ADD CONSTRAINT "listing_questions_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_questions" ADD CONSTRAINT "listing_questions_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
