-- Production Database Baseline Script
-- This script manually adds the houseType column to the existing production database
-- and then marks it as baselined for future Prisma migrations

-- Add houseType column if it doesn't exist
DO $$ 
BEGIN
    -- Check if houseType column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Rental' AND column_name = 'houseType'
    ) THEN
        ALTER TABLE "Rental" ADD COLUMN "houseType" TEXT NOT NULL DEFAULT '房屋類型未明';
        CREATE INDEX IF NOT EXISTS "Rental_houseType_idx" ON "Rental"("houseType");
        RAISE NOTICE 'Added houseType column to Rental table';
    ELSE
        RAISE NOTICE 'houseType column already exists';
    END IF;
END $$;

-- Create Prisma migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- Mark the migration as applied
INSERT INTO "_prisma_migrations" (
    "id", 
    "checksum", 
    "finished_at", 
    "migration_name", 
    "logs", 
    "started_at", 
    "applied_steps_count"
) VALUES (
    '20250726000001-add-house-type-field',
    'b9e3f5c8d9e2a1f4c3b6a8d7e9f2c5b1a4d7e0f3c6b9a2d5e8f1c4b7a0d3e6f9',
    now(),
    '20250726000001_add_house_type_field',
    'Baselined existing production database with houseType field',
    now(),
    1
) ON CONFLICT ("id") DO NOTHING;

-- Verify the column exists
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default 
FROM information_schema.columns 
WHERE table_name = 'Rental' AND column_name = 'houseType';