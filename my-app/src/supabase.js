// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mwhrqtwdfwbdcrwfmqzj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13aHJxdHdkZndiZGNyd2ZtcXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0OTQwODcsImV4cCI6MjA4NzA3MDA4N30.pBCwIv24creiqTwNBE6KT8lwjN378CsKcf3HjV8lwck'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


