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

// Credentials are loaded from config.js (git-ignored).
// See config.example.js for the template.

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
