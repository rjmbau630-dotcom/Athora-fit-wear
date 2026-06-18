supabase.js
const SUPABASE_URL = "https://ndipdrjjbegbanliwlxq.supabase.co";
const SUPABASE_KEY = "sb_publishable_JKOa1nI-f0dLnFxI7tNrCg_92ReyLMv";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

window.db = db;