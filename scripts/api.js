// scripts/api.js
// Supabase 클라이언트 초기화 (환경변수 사용)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Vercel 등 빌드 환경에서는 process.env로 환경변수 주입
// 개발환경(로컬)에서는 .env 파일이나 직접 입력 필요
const SUPABASE_URL = "https://eybuksswxwbvpuyhvocb.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ⚠️ service_role 키는 절대 사용하지 마세요! anon public key만 사용
