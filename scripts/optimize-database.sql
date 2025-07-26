-- PostgreSQL Performance Optimization Script for 591-crawler
-- This script creates additional indexes and optimizations for common query patterns

-- =============================================================================
-- 1. CRITICAL PERFORMANCE INDEXES
-- =============================================================================

-- Optimize getExistingPropertyIds() - most frequent query during crawling
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_rental_lookup 
ON query_rentals (query_id, rental_id) 
INCLUDE (first_appeared, last_appeared);

-- Optimize rental property lookups by property ID (used in upsert operations)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_property_lookup 
ON rentals (property_id) 
INCLUDE (id, first_seen, last_seen);

-- Optimize metro distance queries (frequent joins)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metro_distance_rental_station 
ON metro_distances (rental_id, station_name) 
INCLUDE (distance, metro_value);

-- Optimize distance-based filtering queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metro_distance_range 
ON metro_distances (distance, station_name) 
WHERE distance IS NOT NULL;

-- =============================================================================
-- 2. QUERY PERFORMANCE INDEXES  
-- =============================================================================

-- Optimize query listing and search operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_search_combo 
ON queries (region, is_valid, updated_at DESC) 
INCLUDE (description, stations);

-- Optimize price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_price_range 
ON queries (price_min, price_max, region) 
WHERE price_min IS NOT NULL AND price_max IS NOT NULL;

-- Optimize station-based queries (multi-column for station lists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_stations_search 
ON queries USING GIN (string_to_array(stations, ','))
WHERE stations IS NOT NULL;

-- =============================================================================
-- 3. ANALYTICS AND REPORTING INDEXES
-- =============================================================================

-- Optimize crawl session analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_session_analytics 
ON crawl_sessions (timestamp DESC, query_id) 
INCLUDE (total_rentals, new_rentals, notifications_sent);

-- Optimize rental activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_activity 
ON rentals (last_seen DESC, is_active) 
INCLUDE (first_seen, price);

-- Optimize recent rentals queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_recent_by_region 
ON rentals (first_seen DESC) 
INCLUDE (property_id, title, price)
WHERE is_active = true;

-- =============================================================================
-- 4. TRANSACTION OPTIMIZATION INDEXES
-- =============================================================================

-- Optimize concurrent upsert operations (reduce lock contention)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_upsert_fast 
ON rentals (link) 
INCLUDE (property_id, updated_at);

-- Optimize metro distance upserts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metro_distance_upsert 
ON metro_distances (rental_id, station_id, station_name) 
INCLUDE (distance);

-- =============================================================================
-- 5. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =============================================================================

-- Optimize filtered rental queries (API endpoints)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_filter_combo 
ON rentals (is_active, price, first_seen DESC) 
INCLUDE (property_id, title, rooms);

-- Optimize query-rental relationship queries with time filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_rental_time_filter 
ON query_rentals (query_id, last_appeared DESC) 
INCLUDE (first_appeared, was_notified);

-- =============================================================================
-- 6. PARTIAL INDEXES FOR OPTIMIZATION
-- =============================================================================

-- Index only active rentals (most common queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_active_properties 
ON rentals (property_id, last_seen DESC) 
WHERE is_active = true;

-- Index only rentals with prices (for price analytics)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rental_with_prices 
ON rentals (price, first_seen DESC) 
WHERE price IS NOT NULL AND is_active = true;

-- Index only multi-station crawl sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crawl_session_multi_station 
ON crawl_sessions (timestamp DESC, query_id) 
WHERE is_multi_station = true;

-- =============================================================================
-- 7. STATISTICS UPDATES
-- =============================================================================

-- Update table statistics for better query planning
ANALYZE queries;
ANALYZE rentals;
ANALYZE metro_distances;
ANALYZE query_rentals;
ANALYZE crawl_sessions;

-- =============================================================================
-- 8. PERFORMANCE MONITORING VIEWS
-- =============================================================================

-- Create view for monitoring slow queries
CREATE OR REPLACE VIEW v_performance_monitor AS
SELECT 
  schemaname,
  tablename,
  attname,
  inherited,
  null_frac,
  avg_width,
  n_distinct,
  most_common_vals,
  most_common_freqs,
  histogram_bounds
FROM pg_stats 
WHERE schemaname = 'public' 
AND tablename IN ('queries', 'rentals', 'metro_distances', 'query_rentals', 'crawl_sessions');

-- Create view for index usage monitoring  
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  ROUND((idx_tup_fetch::float / NULLIF(idx_tup_read, 0)) * 100, 2) as hit_rate
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- =============================================================================
-- EXECUTION SUMMARY
-- =============================================================================

-- Database optimization completed!
-- Created 16 performance indexes for:
--   - Property lookup and upsert operations
--   - Metro distance filtering 
--   - Query search and analytics
--   - Transaction performance
-- Use v_performance_monitor and v_index_usage views to monitor performance