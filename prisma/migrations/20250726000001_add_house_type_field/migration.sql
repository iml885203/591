-- CreateEnum
CREATE TYPE "DatabaseProvider" AS ENUM ('sqlite', 'postgresql');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Query" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "firstCrawl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCrawl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCrawls" INTEGER NOT NULL DEFAULT 0,
    "uniqueRentals" INTEGER NOT NULL DEFAULT 0,
    "totalRentals" INTEGER NOT NULL DEFAULT 0,
    "region" TEXT,
    "stations" TEXT[],
    "searchCriteria" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CrawlSession" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "options" JSONB,
    "results" JSONB,
    "totalRentals" INTEGER NOT NULL DEFAULT 0,
    "newRentals" INTEGER NOT NULL DEFAULT 0,
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrawlSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Rental" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "link" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "houseType" TEXT NOT NULL DEFAULT '房屋類型未明',
    "rooms" TEXT NOT NULL DEFAULT '房型未明',
    "size" TEXT,
    "floor" TEXT,
    "type" TEXT,
    "contact" TEXT,
    "features" TEXT[],
    "pricePerPing" REAL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QueryRental" (
    "id" SERIAL NOT NULL,
    "queryId" TEXT NOT NULL,
    "rentalId" INTEGER NOT NULL,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CrawlSessionRental" (
    "id" SERIAL NOT NULL,
    "crawlSessionId" TEXT NOT NULL,
    "rentalId" INTEGER NOT NULL,
    "isNew" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CrawlSessionRental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MetroDistance" (
    "id" SERIAL NOT NULL,
    "rentalId" INTEGER NOT NULL,
    "stationName" TEXT NOT NULL,
    "distanceInMeters" INTEGER NOT NULL,
    "walkingTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetroDistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CrawlSession_queryId_idx" ON "CrawlSession"("queryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CrawlSession_timestamp_idx" ON "CrawlSession"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Rental_link_key" ON "Rental"("link");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Rental_price_idx" ON "Rental"("price");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Rental_location_idx" ON "Rental"("location");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Rental_houseType_idx" ON "Rental"("houseType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Rental_rooms_idx" ON "Rental"("rooms");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Rental_createdAt_idx" ON "Rental"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "QueryRental_queryId_rentalId_key" ON "QueryRental"("queryId", "rentalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueryRental_queryId_idx" ON "QueryRental"("queryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QueryRental_rentalId_idx" ON "QueryRental"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CrawlSessionRental_crawlSessionId_rentalId_key" ON "CrawlSessionRental"("crawlSessionId", "rentalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CrawlSessionRental_crawlSessionId_idx" ON "CrawlSessionRental"("crawlSessionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CrawlSessionRental_rentalId_idx" ON "CrawlSessionRental"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MetroDistance_rentalId_stationName_key" ON "MetroDistance"("rentalId", "stationName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MetroDistance_rentalId_idx" ON "MetroDistance"("rentalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MetroDistance_stationName_idx" ON "MetroDistance"("stationName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MetroDistance_distanceInMeters_idx" ON "MetroDistance"("distanceInMeters");

-- AddForeignKey
ALTER TABLE "CrawlSession" ADD CONSTRAINT "CrawlSession_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRental" ADD CONSTRAINT "QueryRental_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueryRental" ADD CONSTRAINT "QueryRental_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlSessionRental" ADD CONSTRAINT "CrawlSessionRental_crawlSessionId_fkey" FOREIGN KEY ("crawlSessionId") REFERENCES "CrawlSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlSessionRental" ADD CONSTRAINT "CrawlSessionRental_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetroDistance" ADD CONSTRAINT "MetroDistance_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "Rental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration to add houseType field for existing installations
-- This handles cases where the Rental table already exists without houseType
DO $$ 
BEGIN
    -- Check if houseType column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Rental' AND column_name = 'houseType'
    ) THEN
        ALTER TABLE "Rental" ADD COLUMN "houseType" TEXT NOT NULL DEFAULT '房屋類型未明';
        CREATE INDEX IF NOT EXISTS "Rental_houseType_idx" ON "Rental"("houseType");
    END IF;
END $$;