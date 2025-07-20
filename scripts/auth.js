// scripts/auth.js
import { supabase } from "./api.js";

// JWT 토큰 관련 유틸리티 함수들
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error("세션 조회 오류:", error);
      return null;
    }
    return session;
  } catch (e) {
    console.error("세션 조회 실패:", e);
    return null;
  }
}

export async function getCurrentAccessToken() {
  try {
    const session = await getCurrentSession();
    if (session && session.access_token) {
      console.log("[DEBUG] JWT 토큰 획득 성공");
      return session.access_token;
    }
    console.warn("[WARNING] JWT 토큰을 찾을 수 없습니다");
    return null;
  } catch (e) {
    console.error("JWT 토큰 획득 실패:", e);
    return null;
  }
}

// API 요청을 위한 헤더 생성 함수
export async function getAuthHeaders() {
  const token = await getCurrentAccessToken();
  if (!token) {
    throw new Error("인증 토큰이 없습니다. 다시 로그인해주세요.");
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'apikey': supabase.supabaseKey,
    'Content-Type': 'application/json'
  };
}

// 인증된 API 요청 래퍼 함수
export async function makeAuthenticatedRequest(url, options = {}) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("인증이 만료되었습니다. 다시 로그인해주세요.");
      }
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }
    
    return response;
  } catch (e) {
    console.error("인증된 API 요청 실패:", e);
    throw e;
  }
}

// JWT 토큰 만료 처리 함수
export async function refreshTokenIfNeeded() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new Error("세션이 없습니다");
    }
    
    // 토큰 만료 시간 확인 (만료 5분 전에 미리 갱신)
    const expiresAt = session.expires_at * 1000; // Unix timestamp to milliseconds
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (expiresAt - now < fiveMinutes) {
      console.log("[INFO] JWT 토큰 갱신이 필요합니다");
      
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("토큰 갱신 실패:", error);
        throw new Error("토큰 갱신에 실패했습니다");
      }
      
      console.log("[INFO] JWT 토큰이 성공적으로 갱신되었습니다");
      return data.session;
    }
    
    return session;
  } catch (e) {
    console.error("토큰 갱신 처리 실패:", e);
    throw e;
  }
}

// 토큰 유효성 검사 함수
export async function validateToken() {
  try {
    const session = await getCurrentSession();
    if (!session || !session.access_token) {
      return { valid: false, reason: "토큰이 없습니다" };
    }
    
    // 토큰 만료 시간 체크
    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    
    if (now >= expiresAt) {
      return { valid: false, reason: "토큰이 만료되었습니다" };
    }
    
    // 토큰이 곧 만료될 예정인지 체크
    const oneHour = 60 * 60 * 1000;
    const willExpireSoon = (expiresAt - now) < oneHour;
    
    return { 
      valid: true, 
      willExpireSoon,
      expiresIn: Math.floor((expiresAt - now) / 1000)
    };
  } catch (e) {
    console.error("토큰 검증 실패:", e);
    return { valid: false, reason: "토큰 검증 중 오류 발생" };
  }
}

// 전역 토큰 만료 처리 핸들러
export async function handleTokenExpiration() {
  try {
    console.log("[WARNING] 토큰 만료 감지, 자동 로그아웃 처리");
    
    // 사용자에게 알림
    alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
    
    // Supabase 세션 정리
    await supabase.auth.signOut();
    
    // 로그인 화면으로 이동
    if (window.showAuthSection) {
      window.showAuthSection();
    } else {
      // main.js가 로드되지 않은 경우 페이지 새로고침
      window.location.reload();
    }
  } catch (e) {
    console.error("토큰 만료 처리 실패:", e);
    // 최후 수단으로 페이지 새로고침
    window.location.reload();
  }
}

// 이메일 중복 체크 함수
export async function checkEmailExists(email) {
  try {
    // Supabase Auth에서는 직접 이메일 중복 체크를 지원하지 않으므로
    // 임시 회원가입을 시도해서 에러 메시지로 판단
    const { error } = await supabase.auth.signUp({
      email,
      password: "temporary_password_for_check_only",
    });
    
    if (error && error.message.includes("already registered")) {
      return true; // 이메일이 이미 존재함
    }
    return false; // 이메일이 사용 가능
  } catch (e) {
    console.error("이메일 중복 체크 오류:", e);
    return false; // 오류 시 사용 가능으로 처리
  }
}

// 입력값 유효성 검사 함수들
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // 최소 8자, 영문과 숫자 조합
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
}

export async function signUpHandler(email, password) {
  try {
    // 입력값 최종 검증
    if (!validateEmail(email)) {
      alert("유효한 이메일을 입력하세요.");
      return false;
    }
    
    if (!validatePassword(password)) {
      alert("비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.");
      return false;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log("[DEBUG] signUp result", data, error);
    
    if (error) {
      // 중복 이메일 등의 에러 처리
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        alert("이미 가입된 이메일입니다. 로그인을 시도해보세요.");
      } else {
        alert("회원가입 실패: " + error.message);
      }
      return false;
    } else {
      alert("회원가입 성공! 자동으로 로그인됩니다.");
      
      // 회원가입 성공 시 자동 로그인 처리
      if (data.user && data.session) {
        // 즉시 로그인 성공 이벤트 발생 (2초 이내 이동)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("login-success", { detail: { user: data.user } })
          );
        }, 100); // 100ms 후 이동
        return true;
      } else {
        // 이메일 인증이 필요한 경우
        alert("이메일 인증 후 로그인하세요.");
        return false;
      }
    }
  } catch (e) {
    console.error(e);
    alert("예상치 못한 오류가 발생했습니다.");
    return false;
  }
}

export async function signInHandler(email, password) {
  try {
    // 입력값 검증
    if (!email || !password) {
      alert("이메일과 비밀번호를 모두 입력해주세요.");
      return false;
    }

    if (!validateEmail(email)) {
      alert("유효한 이메일 형식이 아닙니다.");
      return false;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log("[DEBUG] signIn result", data, error);
    
    if (error) {
      // 구체적인 에러 메시지 처리
      if (error.message.includes("Invalid login credentials")) {
        alert("이메일 또는 비밀번호가 일치하지 않습니다.");
      } else if (error.message.includes("Email not confirmed")) {
        alert("이메일 인증이 필요합니다. 이메일을 확인해주세요.");
      } else {
        alert("로그인 실패: " + error.message);
      }
      return false;
    } else {
      alert("로그인 성공!");
      // 로그인 성공 시 커스텀 이벤트 발생 (2초 이내 이동)
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("login-success", { detail: { user: data.user } })
        );
      }, 100); // 100ms 후 이동
      return true;
    }
  } catch (e) {
    console.error(e);
    alert("예상치 못한 오류가 발생했습니다.");
    return false;
  }
}

// signInWithEmail 별칭 함수 (요구사항)
export const signInWithEmail = signInHandler;

// 폼 이벤트 연결 (index.html에서 type="module"로 import 필요)
