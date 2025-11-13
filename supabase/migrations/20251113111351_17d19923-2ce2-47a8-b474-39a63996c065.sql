-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('student', 'admin');

-- Create enum for complaint status
CREATE TYPE public.complaint_status AS ENUM ('pending', 'in_progress', 'resolved');

-- Create enum for complaint priority
CREATE TYPE public.complaint_priority AS ENUM ('low', 'medium', 'high');

-- Create enum for complaint category
CREATE TYPE public.complaint_category AS ENUM ('academic', 'hostel', 'transport', 'finance', 'disciplinary', 'others');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  roll_number TEXT,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category complaint_category NOT NULL,
  priority complaint_priority NOT NULL DEFAULT 'medium',
  status complaint_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Complaints policies - Students can view their own complaints
CREATE POLICY "Students can view own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own complaints
CREATE POLICY "Students can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Admins can view all complaints
CREATE POLICY "Admins can view all complaints"
  ON public.complaints FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update complaints
CREATE POLICY "Admins can update complaints"
  ON public.complaints FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Create complaint responses table
CREATE TABLE public.complaint_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on complaint responses
ALTER TABLE public.complaint_responses ENABLE ROW LEVEL SECURITY;

-- Students can view responses to their complaints
CREATE POLICY "Students can view responses to their complaints"
  ON public.complaint_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_responses.complaint_id
      AND complaints.student_id = auth.uid()
    )
  );

-- Admins can view all responses
CREATE POLICY "Admins can view all responses"
  ON public.complaint_responses FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can create responses
CREATE POLICY "Admins can create responses"
  ON public.complaint_responses FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, roll_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'roll_number',
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();