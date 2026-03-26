-- Property Requests Tables
-- Run this in your Supabase SQL editor

-- Create property_requests table
CREATE TABLE IF NOT EXISTS property_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  house_type TEXT NOT NULL,
  location TEXT NOT NULL,
  max_rent INTEGER NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create request_comments table
CREATE TABLE IF NOT EXISTS request_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES property_requests(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT NOT NULL,
  user_type TEXT DEFAULT 'anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If deadline column doesn't exist, add it
ALTER TABLE property_requests
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;

-- Enable RLS (Row Level Security)
ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for property_requests
CREATE POLICY "Anyone can view property requests" ON property_requests
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create property requests" ON property_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own requests" ON property_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own requests" ON property_requests
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for request_comments
CREATE POLICY "Anyone can view comments" ON request_comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create comments" ON request_comments
  FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_requests_created_at ON property_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_requests_location ON property_requests(location);
CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments(request_id);
CREATE INDEX IF NOT EXISTS idx_request_comments_created_at ON request_comments(created_at DESC);