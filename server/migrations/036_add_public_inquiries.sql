CREATE TABLE IF NOT EXISTS public.onec_inquiries (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL, -- 'demo' or 'contact'
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    institution_name VARCHAR(255),
    institution_type VARCHAR(100),
    address TEXT,
    source VARCHAR(100), -- 'Social media', 'Website', 'Linkedin', 'Other (type)'
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
