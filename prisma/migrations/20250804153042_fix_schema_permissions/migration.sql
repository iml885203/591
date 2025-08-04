-- Fix schema permissions for Supabase authentication
-- This migration grants necessary permissions to authenticated and anon roles

DO $$
BEGIN
    -- Only apply permissions if we're in a Supabase environment (auth schema exists)
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        -- Grant usage on public schema to authenticated users
        GRANT USAGE ON SCHEMA public TO authenticated;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

        -- Grant usage on public schema to anonymous users  
        GRANT USAGE ON SCHEMA public TO anon;
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

        -- Ensure future tables also have permissions
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
        
        RAISE NOTICE 'Schema permissions granted for Supabase environment';
    ELSE
        RAISE NOTICE 'Skipping schema permissions - not in Supabase environment';
    END IF;
END
$$;