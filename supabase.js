// ============================================================
// supabase.js — Supabase Client Configuration
// ============================================================
//
// SETUP INSTRUCTIONS:
// 1. Create a project at https://supabase.com
// 2. Go to Project Settings → API
// 3. Copy your Project URL and anon/public key below
// 4. Run the following SQL in your Supabase SQL Editor:
//
//   CREATE TABLE todos (
//     id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
//     user_id     UUID         REFERENCES auth.users NOT NULL,
//     task        TEXT         NOT NULL,
//     priority    TEXT         DEFAULT 'medium'
//                              CHECK (priority IN ('low','medium','high')),
//     due_date    DATE,
//     completed   BOOLEAN      DEFAULT false,
//     category    TEXT,
//     created_at  TIMESTAMPTZ  DEFAULT NOW() NOT NULL
//   );
//
//   ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
//
//   CREATE POLICY "Users manage own todos"
//     ON todos FOR ALL
//     USING (auth.uid() = user_id)
//     WITH CHECK (auth.uid() = user_id);
//
// ============================================================

const SUPABASE_URL      = 'https://dvduwmjfmlpbbxszotvx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2ZHV3bWpmbWxwYmJ4c3pvdHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMDA4NDMsImV4cCI6MjA4ODY3Njg0M30.uas8qeA2ITDu2yevoOSUVwYL_daRoDnFgRnyRxXhyMs';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
