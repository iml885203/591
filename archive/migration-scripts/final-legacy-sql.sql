-- Final cleanup for remaining legacy rental records

-- Try to extract room info from more subtle patterns
UPDATE rentals SET rooms = 
  CASE 
    -- Match "二房" pattern (Chinese number)
    WHEN title ~* '二房' THEN '2房'
    -- Match "雙" patterns (could indicate 2-something)
    WHEN title ~* '雙.*房|雙.*室' THEN '2房'
    -- If title contains坪數 + no clear room info, likely studio
    WHEN title ~* '\d+\.?\d*坪' AND rooms = '房型未明' THEN '套房'
    ELSE rooms
  END
WHERE rooms = '房型未明';

-- Update house types for remaining records
-- If still unknown but has area info, likely apartments
UPDATE rentals SET "houseType" = '整層住家'
WHERE "houseType" = '房屋類型未明' 
AND title ~* '\d+\.?\d*坪|大廈|美邸|寓所|特區';

-- If mentions 站 (station), likely regular apartment
UPDATE rentals SET "houseType" = '整層住家'
WHERE "houseType" = '房屋類型未明' 
AND title ~* '站|捷運.*公尺';

-- Final fallback: if rooms is still unknown, set as 套房 for simplicity
UPDATE rentals SET rooms = '套房'
WHERE rooms = '房型未明';

-- Final fallback: if houseType is still unknown, set as 整層住家 (most common)
UPDATE rentals SET "houseType" = '整層住家'
WHERE "houseType" = '房屋類型未明';

-- Show final results
SELECT 
    "houseType", 
    rooms, 
    COUNT(*) as count 
FROM rentals 
GROUP BY "houseType", rooms 
ORDER BY count DESC;