-- CEAP Production Migration: Role-Based Auth
-- Run this in Supabase SQL Editor to add new columns

-- 1. Add registration keys to tenants
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS join_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS faculty_key VARCHAR(20);

-- 2. Set keys for demo tenant
UPDATE tenants
SET join_code = 'DEMO2026',
    faculty_key = 'FAC-DEMO-2026'
WHERE slug = 'demo';

-- 3. Add status and roll_number to users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS roll_number VARCHAR(30);

-- 4. Make sure all existing users are active
UPDATE users SET status = 'active' WHERE status IS NULL;

-- 5. Create student_whitelist table
CREATE TABLE IF NOT EXISTS student_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    roll_number VARCHAR(30) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    is_registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_tenant_roll UNIQUE (tenant_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_student_whitelist_tenant ON student_whitelist(tenant_id);

-- Verify
SELECT 'tenants columns' as check, column_name FROM information_schema.columns WHERE table_name = 'tenants' AND column_name IN ('join_code', 'faculty_key');
SELECT 'users columns' as check, column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('status', 'roll_number');
SELECT 'whitelist table' as check, table_name FROM information_schema.tables WHERE table_name = 'student_whitelist';
SELECT 'demo tenant keys' as check, slug, join_code, faculty_key FROM tenants WHERE slug = 'demo';
