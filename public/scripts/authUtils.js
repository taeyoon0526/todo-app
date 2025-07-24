// scripts/authUtils.js
// 공통 인증 유틸리티 함수 모듈
import { supabase } from "./api.js";

/**
 * 인증 유틸리티 클래스
 * 공통 인증 로직을 중앙화하여 코드 중복을 제거하고 일관성을 보장합니다.
 */
export class AuthUtils {
  
  /**
   * 현재 세션 확인 (타임아웃 적용)
   * @param {number} timeout - 타임아웃 시간 (기본 2000ms로 단축)
   * @returns {Promise<{session: Object|null, error: Object|null}>}
   */
  static async checkSession(timeout = 2000) {
    try {
      console.log('[AUTH_UTILS] 세션 확인 시작, 타임아웃:', timeout + 'ms');
      
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), timeout)
      );

      const result = await Promise.race([sessionPromise, timeoutPromise]);
      const { data: { session }, error } = result;
      
      console.log('[AUTH_UTILS] 세션 확인 완료:', { hasSession: !!session, hasError: !!error });
      return { session, error };
    } catch (error) {
      console.error('[AUTH_UTILS] 세션 확인 실패:', error.message);
      
      // 타임아웃 에러인 경우 명시적으로 표시
      if (error.message === 'Session check timeout') {
        console.warn('[AUTH_UTILS] 세션 확인 타임아웃 발생');
      }
      
      return { session: null, error };
    }
  }

  /**
   * 세션 유효성 검사
   * @param {Object} session - 세션 객체
   * @returns {boolean} 세션 유효 여부
   */
  static validateSession(session) {
    if (!session || !session.user) {
      return false;
    }

    // 토큰 만료 확인
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      console.warn('[AUTH_UTILS] 만료된 세션 감지');
      return false;
    }

    return true;
  }

  /**
   * 토큰 만료 임박 여부 확인
   * @param {Object} session - 세션 객체
   * @param {number} warningTime - 경고 시간 (초, 기본 1800초 = 30분)
   * @returns {boolean} 만료 임박 여부
   */
  static isTokenExpiringSoon(session, warningTime = 1800) {
    if (!session || !session.expires_at) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return (session.expires_at - now) <= warningTime;
  }

  /**
   * 세션 새로고침
   * @returns {Promise<{success: boolean, session: Object|null, error: Object|null}>}
   */
  static async refreshSession() {
    try {
      console.log('[AUTH_UTILS] 세션 갱신 시도');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('[AUTH_UTILS] 세션 갱신 실패:', error);
        return { success: false, session: null, error };
      }
      
      console.log('[AUTH_UTILS] 세션 갱신 성공');
      return { success: true, session: data.session, error: null };
    } catch (error) {
      console.error('[AUTH_UTILS] 세션 갱신 예외:', error);
      return { success: false, session: null, error };
    }
  }

  /**
   * 라우트 보호 (인증 필요한 기능 접근 제어)
   * @param {Function} callback - 인증 성공 시 실행할 함수
   * @param {Function} onAuthFail - 인증 실패 시 실행할 함수 (선택적)
   * @returns {Promise<boolean>} 접근 허용 여부
   */
  static async protectRoute(callback = null, onAuthFail = null) {
    try {
      const { session, error } = await this.checkSession();
      
      if (error || !this.validateSession(session)) {
        console.warn('[AUTH_UTILS] 라우트 접근 거부 - 인증되지 않은 사용자');
        
        if (onAuthFail && typeof onAuthFail === 'function') {
          onAuthFail();
        } else {
          // 기본 인증 실패 처리
          this.redirectToLogin();
        }
        
        return false;
      }
      
      // 인증 성공 시 콜백 실행
      if (callback && typeof callback === 'function') {
        await callback(session.user);
      }
      
      return true;
    } catch (error) {
      console.error('[AUTH_UTILS] 라우트 보호 중 오류:', error);
      
      if (onAuthFail && typeof onAuthFail === 'function') {
        onAuthFail();
      } else {
        this.redirectToLogin();
      }
      
      return false;
    }
  }

  /**
   * 현재 사용자 정보 조회
   * @returns {Promise<{user: Object|null, session: Object|null}>}
   */
  static async getCurrentUser() {
    const { session } = await this.checkSession();
    
    if (this.validateSession(session)) {
      return { user: session.user, session };
    }
    
    return { user: null, session: null };
  }

  /**
   * 사용자 로그아웃
   * @returns {Promise<{success: boolean, error: Object|null}>}
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AUTH_UTILS] 로그아웃 실패:', error);
        return { success: false, error };
      }
      
      console.log('[AUTH_UTILS] 로그아웃 성공');
      return { success: true, error: null };
    } catch (error) {
      console.error('[AUTH_UTILS] 로그아웃 예외:', error);
      return { success: false, error };
    }
  }

  /**
   * 로그인 화면으로 리다이렉트
   */
  static redirectToLogin() {
    // 전역 함수가 있으면 사용, 없으면 새로고침
    if (typeof window.showAuthSection === 'function') {
      window.showAuthSection();
    } else {
      console.warn('[AUTH_UTILS] showAuthSection 함수를 찾을 수 없어 페이지를 새로고침합니다');
      window.location.reload();
    }
  }

  /**
   * 네트워크 오류 여부 확인
   * @param {Object} error - 오류 객체
   * @returns {boolean} 네트워크 오류 여부
   */
  static isNetworkError(error) {
    if (!error) return false;
    
    return (
      error.name === 'TypeError' ||
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      !navigator.onLine
    );
  }

  /**
   * 인증된 API 요청용 헤더 생성
   * @returns {Promise<Object>} 인증 헤더
   */
  static async getAuthHeaders() {
    const { session } = await this.checkSession();
    
    if (!this.validateSession(session)) {
      throw new Error('인증 토큰이 없습니다. 다시 로그인해주세요.');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabase.supabaseKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 인증된 API 요청 실행
   * @param {string} url - 요청 URL
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Response>} fetch 응답
   */
  static async makeAuthenticatedRequest(url, options = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error('[AUTH_UTILS] 인증된 API 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 세션 모니터링 시작
   * @param {Function} onSessionExpired - 세션 만료 시 콜백
   * @param {number} interval - 체크 간격 (기본 30초)
   * @returns {number} 인터벌 ID
   */
  static startSessionMonitoring(onSessionExpired = null, interval = 30000) {
    return setInterval(async () => {
      const { session } = await this.checkSession();
      
      if (!this.validateSession(session)) {
        console.warn('[AUTH_UTILS] 세션 모니터링 - 세션 만료 감지');
        
        if (onSessionExpired && typeof onSessionExpired === 'function') {
          onSessionExpired();
        } else {
          this.redirectToLogin();
        }
      } else if (this.isTokenExpiringSoon(session)) {
        console.warn('[AUTH_UTILS] 세션 모니터링 - 토큰이 곧 만료됩니다');
        
        // 토스트 알림 표시 (전역 ToastManager 사용)
        if (typeof ToastManager !== 'undefined') {
          ToastManager.show('세션이 곧 만료됩니다. 작업을 저장해주세요.', 'warning', 8000);
        }
      }
    }, interval);
  }

  /**
   * 세션 모니터링 중지
   * @param {number} intervalId - 인터벌 ID
   */
  static stopSessionMonitoring(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('[AUTH_UTILS] 세션 모니터링 중지');
    }
  }
}

/**
 * 하위 호환성을 위한 개별 함수 exports
 */

// 기존 auth.js 함수들과의 호환성 유지
export const getCurrentSession = () => AuthUtils.checkSession().then(result => result.session);
export const validateToken = async () => {
  const { session } = await AuthUtils.checkSession();
  const valid = AuthUtils.validateSession(session);
  
  if (!valid) {
    return { valid: false, reason: "토큰이 없거나 만료되었습니다" };
  }
  
  const willExpireSoon = AuthUtils.isTokenExpiringSoon(session);
  const expiresIn = session.expires_at ? (session.expires_at - Math.floor(Date.now() / 1000)) : 0;
  
  return { valid: true, willExpireSoon, expiresIn };
};

export const refreshTokenIfNeeded = async () => {
  const { session } = await AuthUtils.checkSession();
  
  if (!session || AuthUtils.isTokenExpiringSoon(session, 300)) { // 5분 전에 갱신
    const result = await AuthUtils.refreshSession();
    return result.session;
  }
  
  return session;
};

export const getAuthHeaders = AuthUtils.getAuthHeaders;
export const makeAuthenticatedRequest = AuthUtils.makeAuthenticatedRequest;
export const protectRoute = AuthUtils.protectRoute;
export const checkSession = AuthUtils.checkSession;

// 기본 export
export default AuthUtils;
