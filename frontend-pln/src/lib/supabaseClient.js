// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Pastikan Anda sudah punya .env di frontend dengan variable ini
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zfyrgplbjrhhrfomkbky.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeXJncGxianJoaHJmb21rYmt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzODI3MTgsImV4cCI6MjA4MTk1ODcxOH0.aCS1c3TYAGTYrkj2jAnxELsXXfuuPCAkHjLdOZFVnRs";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
