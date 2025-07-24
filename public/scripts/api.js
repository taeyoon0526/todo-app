/**
 * TODO-LIST Application - API Client
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/api.js
// Supabase 클라이언트 초기화 (환경변수 사용)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// 환경변수 또는 설정 파일에서 값 로드
const SUPABASE_URL = window.ENV?.SUPABASE_URL 
  || import.meta?.env?.VITE_SUPABASE_URL 
  || "https://eybuksswxwbvpuyhvocb.supabase.co";

const SUPABASE_KEY = window.ENV?.SUPABASE_ANON_KEY 
  || import.meta?.env?.VITE_SUPABASE_ANON_KEY 
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw";

// 환경변수 검증
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase URL 또는 KEY가 설정되지 않았습니다. 환경변수를 확인하세요.");
}

// URL 형식 검증
try {
  new URL(SUPABASE_URL);
} catch (e) {
  throw new Error("올바르지 않은 Supabase URL 형식입니다: " + SUPABASE_URL);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 초기화 검증
if (!supabase) {
  throw new Error("Supabase 클라이언트 초기화에 실패했습니다.");
}

// ⚠️ service_role 키는 절대 사용하지 마세요! anon public key만 사용

console.log("[INFO] Supabase 클라이언트가 성공적으로 초기화되었습니다.");

// 사용자 정보 저장 함수
export async function saveUserInfo(user) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ 
        id: user.id, 
        email: user.email,
        last_login: new Date().toISOString(),
        created_at: user.created_at || new Date().toISOString()
      }, { 
        onConflict: 'id' 
      });
      
    if (error) {
      console.error("[ERROR] 사용자 정보 저장 실패:", error);
      return { success: false, error };
    }
    
    console.log("[INFO] 사용자 정보 저장 성공:", user.email);
    return { success: true, data };
    
  } catch (error) {
    console.error("[ERROR] 사용자 정보 upsert 예외:", error);
    return { success: false, error };
  }
}
