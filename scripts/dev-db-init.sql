-- Development Database Initialization Script
-- This script sets up the initial database structure for development

-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create indexes that are commonly used in queries
-- (These will be created by Prisma migrations, but having them here as reference)

-- Performance monitoring views for development
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs,
    histogram_bounds
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY schemaname, tablename;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION db_health_check()
RETURNS TABLE(
    status TEXT,
    database_name TEXT,
    version TEXT,
    uptime INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'healthy'::TEXT as status,
        current_database()::TEXT as database_name,
        version()::TEXT as version,
        now() - pg_postmaster_start_time() as uptime;
END;
$$ LANGUAGE plpgsql;

-- Log the initialization
INSERT INTO pg_stat_statements_info (dealloc) 
VALUES (0) 
ON CONFLICT DO NOTHING;

-- Output confirmation
DO $$
BEGIN
    RAISE NOTICE 'Development database initialized successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'Version: %', version();
END $$;