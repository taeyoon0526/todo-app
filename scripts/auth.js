// scripts/auth.js
import { supabase } from "./api.js";
import AuthUtils from "./authUtils.js";

// JWT 토큰 관련 유틸리티 함수들 (하위 호환성을 위한 래퍼)
export async function getCurrentSession() {
  const { session } = await AuthUtils.checkSession();
  return session;
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

// API 요청을 위한 헤더 생성 함수 (AuthUtils 사용)
export async function getAuthHeaders() {
  return await AuthUtils.getAuthHeaders();
}

// 인증된 API 요청 래퍼 함수 (AuthUtils 사용)
export async function makeAuthenticatedRequest(url, options = {}) {
  return await AuthUtils.makeAuthenticatedRequest(url, options);
}

// JWT 토큰 만료 처리 함수 (AuthUtils 사용)
export async function refreshTokenIfNeeded() {
  try {
    const { session } = await AuthUtils.checkSession();
    
    if (!session || AuthUtils.isTokenExpiringSoon(session, 300)) { // 5분 전에 갱신
      console.log("[INFO] JWT 토큰 갱신이 필요합니다");
      
      const result = await AuthUtils.refreshSession();
      if (!result.success) {
        console.error("토큰 갱신 실패:", result.error);
        throw new Error("토큰 갱신에 실패했습니다");
      }
      
      console.log("[INFO] JWT 토큰이 성공적으로 갱신되었습니다");
      return result.session;
    }
    
    return session;
  } catch (e) {
    console.error("토큰 갱신 처리 실패:", e);
    throw e;
  }
}

// 토큰 유효성 검사 함수 (AuthUtils 사용)
export async function validateToken() {
  try {
    const { session } = await AuthUtils.checkSession();
    if (!session || !session.access_token) {
      return { valid: false, reason: "토큰이 없습니다" };
    }
    
    const valid = AuthUtils.validateSession(session);
    if (!valid) {
      return { valid: false, reason: "토큰이 만료되었습니다" };
    }
    
    // 토큰이 곧 만료될 예정인지 체크
    const willExpireSoon = AuthUtils.isTokenExpiringSoon(session);
    const expiresIn = session.expires_at ? (session.expires_at - Math.floor(Date.now() / 1000)) : 0;
    
    return { 
      valid: true, 
      willExpireSoon,
      expiresIn
    };
  } catch (e) {
    console.error("토큰 검증 실패:", e);
    return { valid: false, reason: "토큰 검증 중 오류 발생" };
  }
}

// 전역 토큰 만료 처리 핸들러 (AuthUtils 사용)
export async function handleTokenExpiration() {
  try {
    console.log("[WARNING] 토큰 만료 감지, 자동 로그아웃 처리");
    
    // 사용자에게 알림
    alert("로그인 세션이 만료되었습니다. 다시 로그인해주세요.");
    
    // AuthUtils를 사용하여 로그아웃 및 리다이렉트
    await AuthUtils.signOut();
    AuthUtils.redirectToLogin();
  } catch (e) {
    console.error("토큰 만료 처리 실패:", e);
    // 최후 수단으로 페이지 새로고침
    window.location.reload();
  }
}

// 이메일 중복 체크 함수 (회원가입용)
export async function checkEmailExists(email) {
  try {
    // 비밀번호 재설정을 통한 사용자 존재 확인 (더 안전)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:8000/password-reset-check-only'
    });
    
    if (error) {
      // 사용자가 존재하지 않으면 에러 발생
      if (error.message.includes('User not found') || 
          error.message.includes('user not found') ||
          error.message.includes('Invalid email')) {
        return false; // 이메일이 사용 가능
      }
      // 기타 에러는 존재한다고 가정
      return true;
    }
    
    return true; // 에러가 없으면 사용자 존재
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

// 사용자 존재 여부 확인 함수 (보안상 안전한 방법)
export async function checkUserExists(email) {
  try {
    // 실제로는 회원가입 시도를 통해 확인하지만,
    // 더 안전한 방법은 비밀번호 재설정 요청으로 확인하는 것
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:8000/password-reset' // 실제로는 작동하지 않는 URL
    });
    
    // 사용자가 존재하지 않으면 특정 에러가 발생
    if (error && error.message.includes('User not found')) {
      return false; // 사용자 존재하지 않음
    }
    
    return true; // 사용자 존재할 가능성 높음 (또는 확실하지 않음)
  } catch (e) {
    console.warn("[WARN] 사용자 존재 확인 실패:", e);
    return true; // 불확실한 경우 존재한다고 가정
  }
}

export async function signUpHandler(email, password) {
  try {
    // 입력값 최종 검증
    if (!validateEmail(email)) {
      throw new Error("유효한 이메일을 입력하세요.");
    }
    
    if (!validatePassword(password)) {
      throw new Error("비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다.");
    }
    
    // 네트워크 연결 상태 확인
    if (!navigator.onLine) {
      throw new Error('Failed to fetch');
    }
    
    console.log("[DEBUG] 회원가입 시도:", { email: email, passwordLength: password.length });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    console.log("[DEBUG] signUp 응답 상세:", {
      hasData: !!data,
      hasUser: !!(data && data.user),
      hasSession: !!(data && data.session),
      hasError: !!error,
      errorMessage: error ? error.message : null,
      errorStatus: error ? error.status : null,
      userEmail: data && data.user ? data.user.email : null,
      fullError: error
    });
    
    if (error) {
      console.error("[DEBUG] 회원가입 에러 상세:", error);
      
      // 구체적인 에러 처리
      if (error.message.includes("already registered") || 
          error.message.includes("already been registered") ||
          error.message.includes("User already registered")) {
        throw new Error("User already registered");
      } else if (error.message.includes("Signup disabled")) {
        throw new Error("Signup disabled");
      } else if (error.message.includes("rate limit")) {
        throw new Error("Too many requests");
      } else {
        console.error("[DEBUG] 예상치 못한 회원가입 에러:", error);
        throw error;
      }
    } else {
      // 회원가입 성공 시 자동 로그인 처리
      if (data.user && data.session) {
        console.log("[SUCCESS] 회원가입 및 자동 로그인 성공:", {
          userId: data.user.id,
          email: data.user.email,
          hasSession: !!data.session
        });
        ToastManager.show("회원가입 성공! 자동으로 로그인됩니다.", "success", 3000);
        
        // 즉시 로그인 성공 이벤트 발생 (2초 이내 이동)
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("login-success", { detail: { user: data.user } })
          );
        }, 100); // 100ms 후 이동
        return true;
      } else if (data.user && !data.session) {
        // 이메일 인증이 필요한 경우
        console.log("[INFO] 회원가입 성공, 이메일 인증 필요:", data.user.email);
        ToastManager.show("이메일 인증 후 로그인하세요.", "info", 5000);
        return false;
      } else {
        console.error("[DEBUG] 회원가입 응답에 필수 데이터 누락:", data);
        throw new Error("회원가입 응답이 올바르지 않습니다.");
      }
    }
  } catch (error) {
    console.error('[AUTH] 회원가입 오류:', error);
    
    // AuthErrorHandler 사용 (main.js에서 import 필요)
    if (typeof AuthErrorHandler !== 'undefined') {
      AuthErrorHandler.showError(error, 'SIGNUP');
    } else {
      // 폴백 처리
      const errorMessages = {
        'User already registered': '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
        'Signup disabled': '현재 회원가입이 비활성화되어 있습니다. 관리자에게 문의해주세요.',
        'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        'Failed to fetch': '네트워크 연결을 확인해주세요.'
      };
      
      const userMessage = errorMessages[error.message] || `회원가입 실패: ${error.message}`;
      
      if (typeof ToastManager !== 'undefined') {
        ToastManager.show(userMessage, 'error', 8000);
      } else {
        alert(userMessage);
      }
    }
    
    return false;
  }
}

export async function signInHandler(email, password) {
  try {
    // 입력값 검증
    if (!email || !password) {
      throw new Error("이메일과 비밀번호를 모두 입력해주세요.");
    }

    if (!validateEmail(email)) {
      throw new Error("유효한 이메일 형식이 아닙니다.");
    }
    
    // 네트워크 연결 상태 확인
    if (!navigator.onLine) {
      throw new Error('Failed to fetch');
    }

    console.log("[DEBUG] 로그인 시도:", { email: email, passwordLength: password.length });

    // 로그인 시도 전 기존 세션 정리
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.warn("[WARN] 기존 세션 정리 실패:", signOutError);
    }

    // 사용자 존재 여부 미리 확인 (선택적)
    console.log("[DEBUG] 사용자 인증 진행 중...");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log("[DEBUG] signIn 응답 상세:", {
      hasData: !!data,
      hasUser: !!(data && data.user),
      hasSession: !!(data && data.session),
      hasError: !!error,
      errorMessage: error ? error.message : null,
      errorStatus: error ? error.status : null,
      errorCode: error ? error.code : null,
      userEmail: data && data.user ? data.user.email : null,
      fullError: error
    });
    
    if (error) {
      console.error("[DEBUG] 로그인 에러 상세:", error);
      
      // 구체적인 에러 메시지 처리
      if (error.message.includes("Invalid login credentials") || 
          error.message.includes("invalid credentials") ||
          error.message.includes("invalid_credentials")) {
        throw new Error("Invalid login credentials");
      } else if (error.message.includes("Email not confirmed")) {
        throw new Error("Email not confirmed");
      } else if (error.message.includes("Too many requests")) {
        throw new Error("Too many requests");
      } else if (error.message.includes("rate limit")) {
        throw new Error("Too many requests");
      } else {
        console.error("[DEBUG] 예상치 못한 로그인 에러:", error);
        throw error;
      }
    } else if (!data || !data.user || !data.session) {
      // 데이터가 있지만 user나 session이 없는 경우
      console.error("[DEBUG] 로그인 응답에 필수 데이터 누락:", data);
      throw new Error("로그인 응답이 올바르지 않습니다.");
    } else {
      // 추가 사용자 검증: 이메일이 일치하는지 확인
      if (data.user.email !== email) {
        console.error("[SECURITY] 로그인 요청 이메일과 응답 이메일이 다름:", {
          requested: email,
          returned: data.user.email
        });
        await supabase.auth.signOut(); // 세션 정리
        throw new Error("인증 오류가 발생했습니다.");
      }

      console.log("[SUCCESS] 로그인 성공:", {
        userId: data.user.id,
        email: data.user.email,
        hasSession: !!data.session
      });
      ToastManager.show("로그인 성공!", "success", 2000);
      
      // 로그인 성공 시 커스텀 이벤트 발생 (2초 이내 이동)
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("login-success", { detail: { user: data.user } })
        );
      }, 100); // 100ms 후 이동
      return true;
    }
  } catch (error) {
    console.error('[AUTH] 로그인 오류:', error);
    
    // AuthErrorHandler 사용 (main.js에서 import 필요)
    if (typeof AuthErrorHandler !== 'undefined') {
      AuthErrorHandler.showError(error, 'LOGIN');
    } else {
      // 폴백 처리
      const errorMessages = {
        'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
        'Email not confirmed': '이메일 인증이 필요합니다. 이메일을 확인해주세요.',
        'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        'Failed to fetch': '네트워크 연결을 확인해주세요.',
        '이메일과 비밀번호를 모두 입력해주세요.': '이메일과 비밀번호를 모두 입력해주세요.',
        '유효한 이메일 형식이 아닙니다.': '유효한 이메일 형식이 아닙니다.'
      };
      
      const userMessage = errorMessages[error.message] || `로그인 실패: ${error.message}`;
      
      if (typeof ToastManager !== 'undefined') {
        ToastManager.show(userMessage, 'error', 8000);
      } else {
        alert(userMessage);
      }
    }
    
    return false;
  }
}

// signInWithEmail 별칭 함수 (요구사항)
export const signInWithEmail = signInHandler;

// 폼 이벤트 연결 (index.html에서 type="module"로 import 필요)
