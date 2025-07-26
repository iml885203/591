-- CreateTable
CREATE TABLE "queries" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "region" TEXT,
    "kind" TEXT,
    "stations" TEXT,
    "metro" TEXT,
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "sections" TEXT,
    "rooms" TEXT,
    "floorRange" TEXT,
    "groupHash" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_sessions" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "maxLatest" INTEGER,
    "notifyMode" TEXT,
    "filteredMode" TEXT,
    "filterConfig" JSONB,
    "totalRentals" INTEGER NOT NULL DEFAULT 0,
    "newRentals" INTEGER NOT NULL DEFAULT 0,
    "duplicateRentals" INTEGER NOT NULL DEFAULT 0,
    "notificationsSent" BOOLEAN NOT NULL DEFAULT false,
    "isMultiStation" BOOLEAN NOT NULL DEFAULT false,
    "stationsCrawled" TEXT,
    "maxConcurrent" INTEGER,
    "delayBetweenReqs" INTEGER,
    "enableMerging" BOOLEAN NOT NULL DEFAULT true,
    "isMigrated" BOOLEAN NOT NULL DEFAULT false,
    "originalUrlKey" TEXT,
    "migrationDate" TIMESTAMP(3),
    "hasErrors" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,

    CONSTRAINT "crawl_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "houseType" TEXT NOT NULL,
    "rooms" TEXT NOT NULL,
    "metroTitle" TEXT,
    "metroValue" TEXT,
    "tags" TEXT,
    "imgUrls" TEXT,
    "price" INTEGER,
    "deposit" INTEGER,
    "area" DOUBLE PRECISION,
    "floor" TEXT,
    "address" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metro_distances" (
    "id" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "stationId" TEXT,
    "stationName" TEXT NOT NULL,
    "distance" INTEGER,
    "metroValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metro_distances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_rentals" (
    "queryId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "firstAppeared" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAppeared" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wasNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "query_rentals_pkey" PRIMARY KEY ("queryId","rentalId")
);

-- CreateTable
CREATE TABLE "crawl_session_rentals" (
    "sessionId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "wasNew" BOOLEAN NOT NULL DEFAULT false,
    "wasNotified" BOOLEAN NOT NULL DEFAULT false,
    "notifyMode" TEXT,
    "silentNotify" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "crawl_session_rentals_pkey" PRIMARY KEY ("sessionId","rentalId")
);

-- CreateTable
CREATE TABLE "query_statistics" (
    "queryId" TEXT NOT NULL,
    "totalCrawls" INTEGER NOT NULL DEFAULT 0,
    "totalRentals" INTEGER NOT NULL DEFAULT 0,
    "uniqueRentals" INTEGER NOT NULL DEFAULT 0,
    "avgRentalsPerCrawl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxRentalsInCrawl" INTEGER NOT NULL DEFAULT 0,
    "avgPrice" DOUBLE PRECISION,
    "medianPrice" DOUBLE PRECISION,
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "priceRanges" JSONB,
    "lastCrawl" TIMESTAMP(3),
    "crawlFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_statistics_pkey" PRIMARY KEY ("queryId")
);

-- CreateIndex
CREATE INDEX "queries_region_idx" ON "queries"("region");

-- CreateIndex
CREATE INDEX "queries_groupHash_idx" ON "queries"("groupHash");

-- CreateIndex
CREATE INDEX "queries_stations_idx" ON "queries"("stations");

-- CreateIndex
CREATE INDEX "queries_priceMin_priceMax_idx" ON "queries"("priceMin", "priceMax");

-- CreateIndex
CREATE INDEX "queries_createdAt_idx" ON "queries"("createdAt");

-- CreateIndex
CREATE INDEX "queries_region_isValid_updatedAt_idx" ON "queries"("region", "isValid", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "queries_priceMin_priceMax_region_idx" ON "queries"("priceMin", "priceMax", "region");

-- CreateIndex
CREATE INDEX "crawl_sessions_queryId_idx" ON "crawl_sessions"("queryId");

-- CreateIndex
CREATE INDEX "crawl_sessions_timestamp_idx" ON "crawl_sessions"("timestamp");

-- CreateIndex
CREATE INDEX "crawl_sessions_isMigrated_idx" ON "crawl_sessions"("isMigrated");

-- CreateIndex
CREATE INDEX "crawl_sessions_timestamp_queryId_idx" ON "crawl_sessions"("timestamp" DESC, "queryId");

-- CreateIndex
CREATE INDEX "crawl_sessions_isMultiStation_timestamp_idx" ON "crawl_sessions"("isMultiStation", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "rentals_propertyId_key" ON "rentals"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_link_key" ON "rentals"("link");

-- CreateIndex
CREATE INDEX "rentals_propertyId_idx" ON "rentals"("propertyId");

-- CreateIndex
CREATE INDEX "rentals_link_idx" ON "rentals"("link");

-- CreateIndex
CREATE INDEX "rentals_lastSeen_idx" ON "rentals"("lastSeen");

-- CreateIndex
CREATE INDEX "rentals_price_idx" ON "rentals"("price");

-- CreateIndex
CREATE INDEX "rentals_isActive_idx" ON "rentals"("isActive");

-- CreateIndex
CREATE INDEX "rentals_propertyId_lastSeen_idx" ON "rentals"("propertyId", "lastSeen" DESC);

-- CreateIndex
CREATE INDEX "rentals_isActive_price_firstSeen_idx" ON "rentals"("isActive", "price", "firstSeen" DESC);

-- CreateIndex
CREATE INDEX "rentals_lastSeen_isActive_idx" ON "rentals"("lastSeen" DESC, "isActive");

-- CreateIndex
CREATE INDEX "rentals_firstSeen_idx" ON "rentals"("firstSeen" DESC);

-- CreateIndex
CREATE INDEX "rentals_price_firstSeen_idx" ON "rentals"("price", "firstSeen" DESC);

-- CreateIndex
CREATE INDEX "metro_distances_stationId_idx" ON "metro_distances"("stationId");

-- CreateIndex
CREATE INDEX "metro_distances_distance_idx" ON "metro_distances"("distance");

-- CreateIndex
CREATE INDEX "metro_distances_rentalId_stationName_idx" ON "metro_distances"("rentalId", "stationName");

-- CreateIndex
CREATE INDEX "metro_distances_distance_stationName_idx" ON "metro_distances"("distance", "stationName");

-- CreateIndex
CREATE UNIQUE INDEX "metro_distances_rentalId_stationId_stationName_key" ON "metro_distances"("rentalId", "stationId", "stationName");

-- CreateIndex
CREATE INDEX "query_rentals_firstAppeared_idx" ON "query_rentals"("firstAppeared");

-- CreateIndex
CREATE INDEX "query_rentals_queryId_lastAppeared_idx" ON "query_rentals"("queryId", "lastAppeared" DESC);

-- CreateIndex
CREATE INDEX "query_rentals_queryId_firstAppeared_lastAppeared_idx" ON "query_rentals"("queryId", "firstAppeared", "lastAppeared");

-- AddForeignKey
ALTER TABLE "crawl_sessions" ADD CONSTRAINT "crawl_sessions_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metro_distances" ADD CONSTRAINT "metro_distances_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_rentals" ADD CONSTRAINT "query_rentals_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_rentals" ADD CONSTRAINT "query_rentals_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_session_rentals" ADD CONSTRAINT "crawl_session_rentals_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "crawl_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_session_rentals" ADD CONSTRAINT "crawl_session_rentals_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
