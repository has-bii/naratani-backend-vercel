-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "avgMarginRate" DOUBLE PRECISION,
ADD COLUMN     "totalCost" INTEGER,
ADD COLUMN     "totalMargin" INTEGER;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "reservedStock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "supplier" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_entry" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "stock_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_stock_entry" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "stockEntryId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "marginAmount" INTEGER NOT NULL,
    "marginRate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "order_item_stock_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_name_key" ON "supplier"("name");

-- CreateIndex
CREATE INDEX "stock_entry_productId_idx" ON "stock_entry"("productId");

-- CreateIndex
CREATE INDEX "stock_entry_remainingQty_idx" ON "stock_entry"("remainingQty");

-- CreateIndex
CREATE INDEX "order_item_stock_entry_orderItemId_idx" ON "order_item_stock_entry"("orderItemId");

-- CreateIndex
CREATE INDEX "order_item_stock_entry_stockEntryId_idx" ON "order_item_stock_entry"("stockEntryId");

-- AddForeignKey
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_entry" ADD CONSTRAINT "stock_entry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_stock_entry" ADD CONSTRAINT "order_item_stock_entry_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_stock_entry" ADD CONSTRAINT "order_item_stock_entry_stockEntryId_fkey" FOREIGN KEY ("stockEntryId") REFERENCES "stock_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
