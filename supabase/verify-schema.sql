-- Schema verification queries for layouts table
-- Run these after applying the migration to confirm setup

-- 1. Verify all columns exist with correct types
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'layouts' 
ORDER BY ordinal_position;

-- 2. Verify indexes exist
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename = 'layouts'
ORDER BY indexname;

-- 3. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'layouts';

-- 4. Verify RLS policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'layouts'
ORDER BY policyname;

-- 5. Verify search_vector column is generated
SELECT 
  column_name,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'layouts' 
  AND column_name = 'search_vector';
