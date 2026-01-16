-- CreateIndex
CREATE INDEX "order_status_shopId_idx" ON "order"("status", "shopId");

-- CreateIndex
CREATE INDEX "order_createdBy_status_idx" ON "order"("createdBy", "status");

-- CreateIndex
CREATE INDEX "order_shopId_status_idx" ON "order"("shopId", "status");

-- CreateIndex
CREATE INDEX "product_name_idx" ON "product"("name");

-- CreateIndex
CREATE INDEX "product_slug_idx" ON "product"("slug");
