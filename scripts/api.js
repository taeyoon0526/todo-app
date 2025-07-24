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
import { csrfProtection, XSSProtection } from './security.js';

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

// 보안 강화된 사용자 정보 저장 함수 (users 테이블 제거됨 - 로깅만 수행)
export async function saveUserInfo(user) {
  try {
    // XSS 방지를 위한 입력 검증 및 정화
    const sanitizedEmail = XSSProtection.sanitizeInput(user.email, 255);
    
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error('Invalid email format');
    }
    
    // users 테이블이 없으므로 로깅만 수행
    console.log("[INFO] 사용자 정보 검증 완료:", {
      userId: user.id,
      email: sanitizedEmail,
      loginTime: new Date().toISOString()
    });
    
    return { success: true, data: { id: user.id, email: sanitizedEmail } };
    
  } catch (error) {
    console.error("[ERROR] 사용자 정보 검증 실패:", error);
    return { success: false, error };
  }
}

/**
 * 보안 강화된 TODO 생성 함수
 * @param {Object} todoData - TODO 데이터
 * @returns {Promise<Object>} 생성 결과
 */
export async function createTodoSecure(todoData) {
  try {
    // 입력 데이터 검증 및 정화
    const sanitizedTitle = XSSProtection.sanitizeInput(todoData.title, 500);
    const sanitizedDescription = todoData.description ? 
      XSSProtection.sanitizeInput(todoData.description, 1000) : null;
    
    // 필수 필드 검증
    if (!sanitizedTitle.trim()) {
      throw new Error('Title is required');
    }
    
    // 우선순위 검증
    const validPriorities = ['low', 'medium', 'high'];
    if (todoData.priority && !validPriorities.includes(todoData.priority)) {
      throw new Error('Invalid priority value');
    }
    
    // 마감일 검증
    let dueDate = null;
    if (todoData.due_date) {
      dueDate = new Date(todoData.due_date);
      if (isNaN(dueDate.getTime())) {
        throw new Error('Invalid due date');
      }
    }
    
    const secureData = {
      title: sanitizedTitle,
      description: sanitizedDescription,
      priority: todoData.priority || 'medium',
      due_date: dueDate ? dueDate.toISOString() : null,
      completed: false,
      user_id: todoData.user_id,
      display_order: todoData.display_order || 0
    };
    
    // CSRF 보호된 Supabase 호출
    const result = await csrfProtection.wrapSupabaseCall(
      () => supabase.from('todos').insert(secureData).select()
    );
    
    return result;
    
  } catch (error) {
    console.error("[SECURITY] TODO 생성 보안 검증 실패:", error);
    throw error;
  }
}

/**
 * 보안 강화된 TODO 업데이트 함수
 * @param {string} todoId - TODO ID
 * @param {Object} updateData - 업데이트할 데이터
 * @returns {Promise<Object>} 업데이트 결과
 */
export async function updateTodoSecure(todoId, updateData) {
  try {
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(todoId)) {
      throw new Error('Invalid todo ID format');
    }
    
    const secureUpdateData = {};
    
    // title 업데이트 시 검증
    if (updateData.title !== undefined) {
      const sanitizedTitle = XSSProtection.sanitizeInput(updateData.title, 500);
      if (!sanitizedTitle.trim()) {
        throw new Error('Title cannot be empty');
      }
      secureUpdateData.title = sanitizedTitle;
    }
    
    // description 업데이트 시 검증
    if (updateData.description !== undefined) {
      secureUpdateData.description = updateData.description ? 
        XSSProtection.sanitizeInput(updateData.description, 1000) : null;
    }
    
    // priority 업데이트 시 검증
    if (updateData.priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high'];
      if (!validPriorities.includes(updateData.priority)) {
        throw new Error('Invalid priority value');
      }
      secureUpdateData.priority = updateData.priority;
    }
    
    // completed 업데이트 시 검증
    if (updateData.completed !== undefined) {
      secureUpdateData.completed = Boolean(updateData.completed);
    }
    
    // due_date 업데이트 시 검증
    if (updateData.due_date !== undefined) {
      if (updateData.due_date === null) {
        secureUpdateData.due_date = null;
      } else {
        const dueDate = new Date(updateData.due_date);
        if (isNaN(dueDate.getTime())) {
          throw new Error('Invalid due date');
        }
        secureUpdateData.due_date = dueDate.toISOString();
      }
    }
    
    // display_order 업데이트 시 검증
    if (updateData.display_order !== undefined) {
      const order = parseInt(updateData.display_order, 10);
      if (isNaN(order) || order < 0) {
        throw new Error('Invalid display order');
      }
      secureUpdateData.display_order = order;
    }
    
    // CSRF 보호된 Supabase 호출
    const result = await csrfProtection.wrapSupabaseCall(
      () => supabase
        .from('todos')
        .update(secureUpdateData)
        .eq('id', todoId)
        .select()
    );
    
    return result;
    
  } catch (error) {
    console.error("[SECURITY] TODO 업데이트 보안 검증 실패:", error);
    throw error;
  }
}

/**
 * 보안 강화된 TODO 삭제 함수
 * @param {string} todoId - TODO ID
 * @returns {Promise<Object>} 삭제 결과
 */
export async function deleteTodoSecure(todoId) {
  try {
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(todoId)) {
      throw new Error('Invalid todo ID format');
    }
    
    // CSRF 보호된 Supabase 호출
    const result = await csrfProtection.wrapSupabaseCall(
      () => supabase.from('todos').delete().eq('id', todoId)
    );
    
    return result;
    
  } catch (error) {
    console.error("[SECURITY] TODO 삭제 보안 검증 실패:", error);
    throw error;
  }
}
