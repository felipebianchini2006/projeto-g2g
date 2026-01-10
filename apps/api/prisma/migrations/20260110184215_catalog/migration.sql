-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "categoryGroupId" TEXT,
ADD COLUMN     "categorySectionId" TEXT,
ADD COLUMN     "originId" TEXT,
ADD COLUMN     "recoveryOptionId" TEXT,
ADD COLUMN     "salesModelId" TEXT;

-- CreateTable
CREATE TABLE "category_groups" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_sections" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "origin_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "origin_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_options" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_groups_slug_key" ON "category_groups"("slug");

-- CreateIndex
CREATE INDEX "category_groups_categoryId_idx" ON "category_groups"("categoryId");

-- CreateIndex
CREATE INDEX "category_groups_name_idx" ON "category_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "category_sections_slug_key" ON "category_sections"("slug");

-- CreateIndex
CREATE INDEX "category_sections_groupId_idx" ON "category_sections"("groupId");

-- CreateIndex
CREATE INDEX "category_sections_name_idx" ON "category_sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_models_slug_key" ON "sales_models"("slug");

-- CreateIndex
CREATE INDEX "sales_models_name_idx" ON "sales_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "origin_options_slug_key" ON "origin_options"("slug");

-- CreateIndex
CREATE INDEX "origin_options_name_idx" ON "origin_options"("name");

-- CreateIndex
CREATE UNIQUE INDEX "recovery_options_slug_key" ON "recovery_options"("slug");

-- CreateIndex
CREATE INDEX "recovery_options_name_idx" ON "recovery_options"("name");

-- CreateIndex
CREATE INDEX "listings_categoryGroupId_idx" ON "listings"("categoryGroupId");

-- CreateIndex
CREATE INDEX "listings_categorySectionId_idx" ON "listings"("categorySectionId");

-- CreateIndex
CREATE INDEX "listings_salesModelId_idx" ON "listings"("salesModelId");

-- CreateIndex
CREATE INDEX "listings_originId_idx" ON "listings"("originId");

-- CreateIndex
CREATE INDEX "listings_recoveryOptionId_idx" ON "listings"("recoveryOptionId");

-- AddForeignKey
ALTER TABLE "category_groups" ADD CONSTRAINT "category_groups_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_sections" ADD CONSTRAINT "category_sections_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "category_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_categoryGroupId_fkey" FOREIGN KEY ("categoryGroupId") REFERENCES "category_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_categorySectionId_fkey" FOREIGN KEY ("categorySectionId") REFERENCES "category_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_salesModelId_fkey" FOREIGN KEY ("salesModelId") REFERENCES "sales_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_originId_fkey" FOREIGN KEY ("originId") REFERENCES "origin_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_recoveryOptionId_fkey" FOREIGN KEY ("recoveryOptionId") REFERENCES "recovery_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
