-- Enable RLS and create policies for Supabase authentication
-- Only allow authenticated users to read data

-- queries table
ALTER TABLE "queries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON "queries";
DROP POLICY IF EXISTS "Allow authenticated read" ON "queries";
CREATE POLICY "Allow authenticated read" ON "queries" 
FOR SELECT USING (auth.role() = 'authenticated');

-- rentals table  
ALTER TABLE "rentals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON "rentals";
DROP POLICY IF EXISTS "Allow authenticated read" ON "rentals";
CREATE POLICY "Allow authenticated read" ON "rentals" 
FOR SELECT USING (auth.role() = 'authenticated');

-- metro_distances table
ALTER TABLE "metro_distances" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON "metro_distances";
DROP POLICY IF EXISTS "Allow authenticated read" ON "metro_distances";
CREATE POLICY "Allow authenticated read" ON "metro_distances" 
FOR SELECT USING (auth.role() = 'authenticated');

-- query_rentals table
ALTER TABLE "query_rentals" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anonymous read" ON "query_rentals";
DROP POLICY IF EXISTS "Allow authenticated read" ON "query_rentals";
CREATE POLICY "Allow authenticated read" ON "query_rentals" 
FOR SELECT USING (auth.role() = 'authenticated');