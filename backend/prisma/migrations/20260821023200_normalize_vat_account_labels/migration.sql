-- Normalize reserved VAT account labels for existing businesses.
UPDATE "accounts"
SET "name" = 'VAT Receivable (Input VAT)', "type" = 'ASSET'
WHERE "code" = '1110';

UPDATE "accounts"
SET "name" = 'VAT Payable (Output VAT)', "type" = 'LIABILITY'
WHERE "code" = '2100';
