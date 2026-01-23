-- CreateTable
CREATE TABLE "profile_reports" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "message" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedByAdminId" TEXT,
    "adminNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_reports_userId_idx" ON "profile_reports"("userId");

-- CreateIndex
CREATE INDEX "profile_reports_reporterId_idx" ON "profile_reports"("reporterId");

-- CreateIndex
CREATE INDEX "profile_reports_status_idx" ON "profile_reports"("status");

-- CreateIndex
CREATE INDEX "profile_reports_createdAt_idx" ON "profile_reports"("createdAt");

-- AddForeignKey
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_reports" ADD CONSTRAINT "profile_reports_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
