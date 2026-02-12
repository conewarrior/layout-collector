# Supabase Setup Guide

## Overview
This document describes the Supabase schema and storage bucket setup for the Layout Collector MVP.

## Database Schema

### Migration File
- **Location**: `supabase/migrations/001_create_layouts.sql`
- **Status**: Ready to apply

### Table: `layouts`

#### Columns
| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| id | UUID | NO | gen_random_uuid() | Primary key |
| url | TEXT | NO | - | Page URL |
| title | TEXT | YES | - | Page title |
| description | TEXT | YES | - | Page description |
| og_image | TEXT | YES | - | Open Graph image URL |
| og_title | TEXT | YES | - | Open Graph title |
| og_description | TEXT | YES | - | Open Graph description |
| og_type | TEXT | YES | - | Open Graph type |
| favicon_url | TEXT | YES | - | Favicon URL |
| screenshot_path | TEXT | YES | - | Storage path to screenshot |
| page_purpose | TEXT | NO | - | Category: Landing, Dashboard, E-commerce, etc. |
| layout_type | TEXT | NO | - | Category: Hero+CTA, Card Grid, Sidebar+Content, etc. |
| raw_metadata | JSONB | NO | {} | Additional metadata |
| ai_category | JSONB | YES | - | Reserved for future AI classification |
| created_at | TIMESTAMPTZ | NO | NOW() | Creation timestamp |
| search_vector | tsvector | YES | - | Generated full-text search vector |

#### Indexes
- `idx_layouts_page_purpose` - For filtering by page purpose
- `idx_layouts_layout_type` - For filtering by layout type
- `idx_layouts_created_at` - For sorting by creation date (DESC)
- `idx_layouts_url` - For URL lookups
- `idx_layouts_search` - GIN index for full-text search on search_vector

#### Row Level Security (RLS)
- **Status**: ENABLED
- **Policies** (all permissive for anon role):
  - `anon_select`: SELECT access for anonymous users
  - `anon_insert`: INSERT access for anonymous users
  - `anon_delete`: DELETE access for anonymous users

## Storage Setup

### Bucket: `screenshots`
- **Visibility**: Public
- **Purpose**: Store layout screenshots as JPEG images
- **File Naming**: `{layoutId}.jpg`

#### Creation Methods

**Option 1: Supabase CLI**
```bash
supabase storage create-bucket screenshots --public
```

**Option 2: Supabase API (curl)**
```bash
curl -X POST 'https://[PROJECT_ID].supabase.co/storage/v1/b' \
  -H 'authorization: Bearer [ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{"name":"screenshots","public":true}'
```

**Option 3: Supabase Dashboard**
1. Navigate to Storage > Buckets
2. Click "New Bucket"
3. Name: `screenshots`
4. Set to Public
5. Create

## Verification

### Schema Verification
Run the queries in `supabase/verify-schema.sql` to confirm:
1. All 16 columns exist with correct types
2. All 5 indexes are created
3. RLS is enabled
4. 3 RLS policies exist (anon_select, anon_insert, anon_delete)
5. search_vector is a generated column

### CRUD Operations Test

**Insert a layout:**
```bash
curl -X POST 'https://[PROJECT_ID].supabase.co/rest/v1/layouts' \
  -H 'apikey: [ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://example.com",
    "title": "Example Page",
    "description": "A test page",
    "page_purpose": "Landing",
    "layout_type": "Hero+CTA"
  }'
```

**Select layouts:**
```bash
curl -X GET 'https://[PROJECT_ID].supabase.co/rest/v1/layouts' \
  -H 'apikey: [ANON_KEY]'
```

**Delete a layout:**
```bash
curl -X DELETE 'https://[PROJECT_ID].supabase.co/rest/v1/layouts?id=eq.[UUID]' \
  -H 'apikey: [ANON_KEY]'
```

## Environment Variables

Add to `.env.local`:
```
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

## Notes

- **No Authentication**: The RLS policies use the `anon` role, allowing unauthenticated access
- **Duplicate URLs Allowed**: No UNIQUE constraint on url column
- **Full-Text Search**: The `search_vector` column is automatically generated from title, description, and url
- **AI Category Reserved**: The `ai_category` column is nullable and reserved for future AI classification features
