-- Add email column to profiles table and update existing records
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a function to sync user email to profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, updated_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    email = NEW.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync email when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_email();

-- Update existing profiles with email from auth.users
UPDATE profiles 
SET email = auth.users.email,
    updated_at = NOW()
FROM auth.users 
WHERE profiles.id = auth.users.id 
AND profiles.email IS NULL;