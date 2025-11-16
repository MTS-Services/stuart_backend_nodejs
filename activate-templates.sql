-- SQL script to activate all email templates
-- Run this directly in your PostgreSQL database if needed

UPDATE email_templates 
SET is_active = true, updated_at = NOW() 
WHERE is_active = false;

-- Check the result
SELECT 
    id, 
    name, 
    subject, 
    is_active,
    updated_at 
FROM email_templates 
ORDER BY name;