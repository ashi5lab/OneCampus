CREATE TABLE IF NOT EXISTS public.onec_tenants (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,       -- e.g. 'rhss.onecampus.com'
    schema_name VARCHAR(63) UNIQUE NOT NULL,   -- e.g. 'tenant_rhss'
    org_name VARCHAR(255) NOT NULL,
    org_type VARCHAR(30) NOT NULL,             -- 'kindergarten' | 'school' | 'college'
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB NOT NULL,                     -- active_modules, branding, vocabulary_override
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
