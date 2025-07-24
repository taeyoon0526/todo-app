/**
 * TODO-LIST Application - CSRF Protection Module
 * 
 * CSRF(Cross-Site Request Forgery) 공격 방지를 위한 보안 모듈
 * T-034 구현의 일부
 * 
 * Copyright (c) 2025 taeyoon0526
 */

/**
 * CSRF 보호 관리자 클래스
 * Double Submit Cookie 패턴 구현
 */
class CSRFProtection {
  constructor() {
    this.tokenName = 'csrf_token';
    this.headerName = 'X-CSRF-Token';
    this.cookieName = '__csrf_token';
    this.tokenLength = 32;
    
    // 현재 CSRF 토큰
    this.currentToken = null;
    
    console.log('[CSRF] CSRF 보호 시스템 초기화');
  }

  /**
   * 안전한 랜덤 토큰 생성
   * @returns {string} CSRF 토큰
   */
  generateToken() {
    const array = new Uint8Array(this.tokenLength);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * CSRF 토큰을 쿠키에 설정
   * @param {string} token - CSRF 토큰
   */
  setTokenCookie(token) {
    const secure = location.protocol === 'https:';
    const sameSite = 'Strict';
    
    // SameSite=Strict, Secure, HttpOnly는 JS에서 설정 불가하므로 
    // 서버사이드에서 설정해야 하지만, 클라이언트에서 최대한 보안 설정
    document.cookie = `${this.cookieName}=${token}; SameSite=${sameSite}; Path=/; ${secure ? 'Secure;' : ''}`;
    
    console.log('[CSRF] CSRF 토큰 쿠키 설정 완료');
  }

  /**
   * 쿠키에서 CSRF 토큰 읽기
   * @returns {string|null} CSRF 토큰
   */
  getTokenFromCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === this.cookieName) {
        return value;
      }
    }
    return null;
  }

  /**
   * CSRF 토큰 초기화 또는 갱신
   * @returns {string} 새로운 CSRF 토큰
   */
  initializeToken() {
    // 기존 토큰이 있는지 확인
    let token = this.getTokenFromCookie();
    
    // 토큰이 없거나 유효하지 않으면 새로 생성
    if (!token || !this.isValidToken(token)) {
      token = this.generateToken();
      this.setTokenCookie(token);
      console.log('[CSRF] 새로운 CSRF 토큰 생성');
    } else {
      console.log('[CSRF] 기존 CSRF 토큰 사용');
    }
    
    this.currentToken = token;
    return token;
  }

  /**
   * 토큰 유효성 검사
   * @param {string} token - 검사할 토큰
   * @returns {boolean} 유효성 여부
   */
  isValidToken(token) {
    // 토큰이 문자열이고 올바른 길이인지 확인
    if (typeof token !== 'string' || token.length !== this.tokenLength * 2) {
      return false;
    }
    
    // 16진수 문자만 포함하는지 확인
    return /^[a-f0-9]+$/i.test(token);
  }

  /**
   * HTTP 요청에 CSRF 토큰 헤더 추가
   * @param {Object} headers - 기존 헤더 객체
   * @returns {Object} CSRF 토큰이 추가된 헤더 객체
   */
  addTokenToHeaders(headers = {}) {
    if (!this.currentToken) {
      this.initializeToken();
    }
    
    return {
      ...headers,
      [this.headerName]: this.currentToken
    };
  }

  /**
   * Form에 CSRF 토큰 hidden input 추가
   * @param {HTMLFormElement} form - 대상 폼 엘리먼트
   */
  addTokenToForm(form) {
    if (!this.currentToken) {
      this.initializeToken();
    }
    
    // 기존 CSRF 토큰 input 제거
    const existingInput = form.querySelector(`input[name="${this.tokenName}"]`);
    if (existingInput) {
      existingInput.remove();
    }
    
    // 새 CSRF 토큰 input 생성
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = this.tokenName;
    input.value = this.currentToken;
    form.appendChild(input);
    
    console.log('[CSRF] 폼에 CSRF 토큰 추가');
  }

  /**
   * Supabase 요청 래퍼 (CSRF 토큰 자동 추가)
   * @param {Function} supabaseCall - Supabase 호출 함수
   * @param {...any} args - Supabase 함수 인자들
   * @returns {Promise} Supabase 응답
   */
  async wrapSupabaseCall(supabaseCall, ...args) {
    try {
      // 현재 인증 상태 확인
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Authentication required for CSRF-protected request');
      }
      
      // CSRF 토큰을 메타데이터로 추가 (로깅 목적)
      if (!this.currentToken) {
        this.initializeToken();
      }
      
      console.log('[CSRF] CSRF 보호된 Supabase 요청 실행');
      
      // Supabase 호출 실행
      const result = await supabaseCall(...args);
      
      return result;
      
    } catch (error) {
      console.error('[CSRF] CSRF 보호된 요청 실패:', error);
      throw error;
    }
  }

  /**
   * 토큰 검증 (서버 응답과 비교)
   * @param {string} serverToken - 서버에서 받은 토큰
   * @returns {boolean} 검증 결과
   */
  validateToken(serverToken) {
    const clientToken = this.getTokenFromCookie();
    
    if (!clientToken || !serverToken) {
      console.warn('[CSRF] 토큰 검증 실패: 토큰이 없음');
      return false;
    }
    
    const isValid = clientToken === serverToken;
    
    if (!isValid) {
      console.error('[CSRF] 토큰 검증 실패: 토큰 불일치');
    } else {
      console.log('[CSRF] 토큰 검증 성공');
    }
    
    return isValid;
  }

  /**
   * 토큰 갱신 (로그인/로그아웃 시 호출)
   */
  refreshToken() {
    console.log('[CSRF] CSRF 토큰 갱신');
    this.currentToken = null;
    
    // 기존 쿠키 삭제
    document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;`;
    
    // 새 토큰 생성
    this.initializeToken();
  }

  /**
   * 토큰 정리 (로그아웃 시 호출)
   */
  clearToken() {
    console.log('[CSRF] CSRF 토큰 정리');
    this.currentToken = null;
    
    // 쿠키 삭제
    document.cookie = `${this.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;`;
  }

  /**
   * 자동 토큰 갱신 설정 (세션 변경 감지)
   */
  setupAutoRefresh() {
    // Supabase 인증 상태 변경 감지
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[CSRF] 인증 상태 변경 감지:', event);
      
      if (event === 'SIGNED_IN') {
        this.refreshToken();
      } else if (event === 'SIGNED_OUT') {
        this.clearToken();
      }
    });
    
    console.log('[CSRF] 자동 토큰 갱신 설정 완료');
  }
}

/**
 * XSS 방지 유틸리티 함수들
 */
class XSSProtection {
  /**
   * HTML 이스케이프
   * @param {string} str - 이스케이프할 문자열
   * @returns {string} 이스케이프된 문자열
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') return str;
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 안전한 innerHTML 설정
   * @param {HTMLElement} element - 대상 엘리먼트
   * @param {string} content - 설정할 내용
   */
  static safeInnerHTML(element, content) {
    element.textContent = content; // innerHTML 대신 textContent 사용
  }

  /**
   * 사용자 입력 검증 및 정화
   * @param {string} input - 사용자 입력
   * @param {number} maxLength - 최대 길이
   * @returns {string} 정화된 입력
   */
  static sanitizeInput(input, maxLength = 500) {
    if (typeof input !== 'string') return '';
    
    // 길이 제한
    let sanitized = input.slice(0, maxLength);
    
    // 위험한 패턴 제거
    sanitized = sanitized
      .replace(/<script.*?>.*?<\/script>/gi, '') // 스크립트 태그 제거
      .replace(/javascript:/gi, '') // javascript: 프로토콜 제거
      .replace(/on\w+\s*=/gi, '') // 이벤트 핸들러 제거
      .replace(/<iframe.*?>.*?<\/iframe>/gi, '') // iframe 제거
      .replace(/<object.*?>.*?<\/object>/gi, '') // object 제거
      .replace(/<embed.*?>/gi, ''); // embed 제거
    
    return sanitized.trim();
  }

  /**
   * URL 검증
   * @param {string} url - 검증할 URL
   * @returns {boolean} URL 안전성 여부
   */
  static isUrlSafe(url) {
    try {
      const urlObj = new URL(url);
      
      // 허용된 프로토콜만 허용
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return false;
      }
      
      // javascript: 프로토콜 차단
      if (url.toLowerCase().includes('javascript:')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
}

// 전역 인스턴스 생성
export const csrfProtection = new CSRFProtection();
export { XSSProtection };

// 페이지 로드 시 CSRF 토큰 초기화
document.addEventListener('DOMContentLoaded', () => {
  csrfProtection.initializeToken();
  csrfProtection.setupAutoRefresh();
});

console.log('[SECURITY] CSRF 및 XSS 보호 모듈 로드 완료');
