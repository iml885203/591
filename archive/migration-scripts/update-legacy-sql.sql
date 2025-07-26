-- Update legacy rental records with parsed houseType and rooms
-- This SQL script updates existing records that have default values

-- Step 1: Update house types based on title patterns

-- Update 獨立套房 (Independent Studio)
UPDATE rentals SET "houseType" = '獨立套房' 
WHERE "houseType" = '房屋類型未明' 
AND (title ~* '獨立套房|獨棟套房|套房獨立' OR (title ~* '套房' AND title !~* '分租|雅房'));

-- Update 分租套房 (Shared Studio)
UPDATE rentals SET "houseType" = '分租套房' 
WHERE "houseType" = '房屋類型未明' 
AND title ~* '分租套房|套房分租';

-- Update 雅房 (Shared Room)
UPDATE rentals SET "houseType" = '雅房' 
WHERE "houseType" = '房屋類型未明' 
AND title ~* '雅房|分租雅房';

-- Update 整層住家 (Whole Floor/House)
UPDATE rentals SET "houseType" = '整層住家' 
WHERE "houseType" = '房屋類型未明' 
AND title ~* '整層住家|整層|透天|別墅|公寓整層|大樓整層';

-- Update 店面 (Commercial)
UPDATE rentals SET "houseType" = '店面' 
WHERE "houseType" = '房屋類型未明' 
AND title ~* '店面|商用|辦公';

-- Step 2: Update rooms based on title patterns (only where rooms is '房型未明')

-- Update specific room patterns (e.g., 3房2廳1衛)
UPDATE rentals SET rooms = substring(title from '(\d+房\d*廳?\d*衛?)')
WHERE rooms = '房型未明' 
AND title ~* '\d+房\d*廳?\d*衛?';

-- Update simple room patterns (e.g., 3房, 2房)
UPDATE rentals SET rooms = substring(title from '(\d+房)')
WHERE rooms = '房型未明' 
AND title ~* '\d+房' 
AND rooms = '房型未明';

-- Update 套房
UPDATE rentals SET rooms = '套房'
WHERE rooms = '房型未明' 
AND title ~* '套房';

-- Update 雅房
UPDATE rentals SET rooms = '雅房'
WHERE rooms = '房型未明' 
AND title ~* '雅房';

-- Show results
SELECT 
    "houseType", 
    rooms, 
    COUNT(*) as count 
FROM rentals 
GROUP BY "houseType", rooms 
ORDER BY count DESC;