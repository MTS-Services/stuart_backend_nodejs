-- Fix all existing QR cards to have maxScans = 250
UPDATE qr_cards 
SET "maxScans" = 250 
WHERE "maxScans" != 250;

-- Reset scan counts for testing (optional - uncomment if needed for testing)
-- UPDATE qr_cards SET "scanCount" = 0;
-- DELETE FROM scans;
