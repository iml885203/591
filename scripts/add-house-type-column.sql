-- Add houseType column to rentals table
-- This needs to be run on production database

-- Add the houseType column
ALTER TABLE "Rental" ADD COLUMN "houseType" TEXT NOT NULL DEFAULT '房屋類型未明';

-- Update any existing records to have default value (if any)
UPDATE "Rental" SET "houseType" = '房屋類型未明' WHERE "houseType" IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Rental' AND column_name = 'houseType';