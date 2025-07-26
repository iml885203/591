-- Improved legacy rental records update with better pattern matching

-- Step 1: Update rooms first (since most titles contain room info)

-- Update comprehensive room patterns
UPDATE rentals SET rooms = 
  CASE 
    -- Match patterns like "兩房", "三房", "四房" (Chinese numbers)
    WHEN title ~* '兩房' THEN '2房'
    WHEN title ~* '三房' THEN '3房'  
    WHEN title ~* '四房' THEN '4房'
    WHEN title ~* '五房' THEN '5房'
    -- Match patterns like "2房", "3房" (Arabic numbers)
    WHEN title ~* '(\d+)房' THEN substring(title from '(\d+房)')
    -- Match comprehensive patterns like "3房2衛", "2房1廳"
    WHEN title ~* '(\d+房\d*廳?\d*衛?)' THEN substring(title from '(\d+房\d*廳?\d*衛?)')
    -- Match "套房" patterns
    WHEN title ~* '套房' THEN '套房'
    -- Match "雅房" patterns  
    WHEN title ~* '雅房' THEN '雅房'
    ELSE rooms
  END
WHERE rooms = '房型未明';

-- Step 2: Update house types based on room patterns and other indicators

-- For records with room info, set as 整層住家 (likely whole apartments)
UPDATE rentals SET "houseType" = '整層住家'
WHERE "houseType" = '房屋類型未明' 
AND (
  rooms ~* '\d+房' OR 
  rooms ~* '兩房|三房|四房|五房' OR
  title ~* '公寓|大樓|整修|全新整理|近捷運|社會住宅'
);

-- Update 套房 types
UPDATE rentals SET "houseType" = '獨立套房'
WHERE "houseType" = '房屋類型未明' 
AND (rooms = '套房' OR title ~* '套房');

-- Update 雅房 types  
UPDATE rentals SET "houseType" = '雅房'
WHERE "houseType" = '房屋類型未明' 
AND (rooms = '雅房' OR title ~* '雅房');

-- For records that mention 合租, 分租 -> likely shared
UPDATE rentals SET "houseType" = '分租套房'
WHERE "houseType" = '房屋類型未明' 
AND title ~* '合租|分租';

-- Show updated results
SELECT 
    "houseType", 
    rooms, 
    COUNT(*) as count 
FROM rentals 
GROUP BY "houseType", rooms 
ORDER BY count DESC;