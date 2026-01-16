-- AlterTable
ALTER TABLE "order" ADD COLUMN     "createdBy" UUID;

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE INDEX "order_createdBy_idx" ON "order"("createdBy");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
