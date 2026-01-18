-- Update handle_new_user function with validation to prevent misuse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that user ID is not null to prevent invalid profile creation
  IF NEW.id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  -- Validate email format if provided (optional but adds safety)
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  INSERT INTO public.user_profiles (id, email, subscription_plan, subscription_status)
  VALUES (NEW.id, NEW.email, 'free', 'active')
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate profile errors
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;