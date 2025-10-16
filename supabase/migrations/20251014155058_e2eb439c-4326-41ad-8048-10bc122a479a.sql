-- Manually confirm the admin email address
UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE email = 'dr.razvi01@gmail.com' AND email_confirmed_at IS NULL;