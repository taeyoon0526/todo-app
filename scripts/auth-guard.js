/**
 * AuthGuard - 인증 상태 기반 렌더링 가드 컴포넌트
 * 
 * 기능:
 * - 인증 상태 확인 전까지 TODO 리스트 컴포넌트 보호
 * - 조건부 렌더링으로 인증 실패 시 로그인 UI만 노출
 * - 인증 확인 중 로딩 스피너 표시
 * - 인증 성공 시 TodoList 컴포넌트 렌더링
 */

import { supabase } from './api.js';
import AuthUtils from './authUtils.js';

class AuthGuard {
  constructor() {
    this.isAuthChecked = false;
    this.isAuthenticated = false;
    this.authCheckInProgress = false;
    this.currentUserId = null;
    
    // DOM 요소 참조
    this.authSection = null;
    this.todoApp = null;
    this.loadingOverlay = null;
    
    // 초기화
    this.init();
  }
  
  /**
   * AuthGuard 초기화
   */
  init() {
    console.log('[AUTH_GUARD] 인증 가드 시스템 초기화');
    
    // DOM 요소 캐싱
    this.authSection = document.getElementById("auth-section");
    this.todoApp = document.getElementById("todo-app");
    
    if (!this.authSection || !this.todoApp) {
      console.error('[AUTH_GUARD] 필수 DOM 요소를 찾을 수 없습니다');
      return;
    }
    
    // 초기 상태 강제 설정 (안전장치)
    console.log('[AUTH_GUARD] 초기 상태 설정 - 로그인 화면 표시');
    this.authSection.style.display = 'block';
    this.todoApp.style.display = 'none';
    this.todoApp.classList.remove('todo-app-visible');
    this.todoApp.classList.add('todo-app-hidden');
    
    // 인증 상태 변경 이벤트 리스너 등록
    this.setupEventListeners();
    
    // 초기 인증 상태 확인 (약간의 지연을 두어 DOM이 완전히 로드되도록)
    setTimeout(() => {
      this.checkAuthState();
    }, 100);
  }
  
  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 로그인 성공 이벤트
    window.addEventListener('login-success', (event) => {
      console.log('[AUTH_GUARD] 로그인 성공 이벤트 수신');
      this.handleAuthSuccess(event.detail.user);
    });
    
    // 로그아웃 이벤트
    window.addEventListener('logout-complete', () => {
      console.log('[AUTH_GUARD] 로그아웃 완료 이벤트 수신');
      this.handleAuthFailure();
    });
    
    // Supabase 인증 상태 변경 리스너 등록
    if (supabase && supabase.auth) {
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH_GUARD] Supabase 인증 상태 변경:', event);
        this.handleSupabaseAuthChange(event, session);
      });
    } else {
      console.error('[AUTH_GUARD] Supabase 클라이언트를 찾을 수 없습니다');
    }
  }
  
  /**
   * 인증 상태 체크 (AuthUtils 사용)
   */
  async checkAuthState() {
    if (this.authCheckInProgress) {
      console.log('[AUTH_GUARD] 인증 체크가 이미 진행 중입니다');
      return;
    }
    
    this.authCheckInProgress = true;
    console.log('[AUTH_GUARD] 인증 상태 체크 시작');
    
    // 타임아웃 설정 (5초)
    const authTimeout = setTimeout(() => {
      console.warn('[AUTH_GUARD] 인증 체크 타임아웃 - 로그인 화면으로 이동');
      this.handleAuthTimeout();
    }, 5000);
    
    try {
      // 1. 로딩 상태 표시
      this.showLoadingState();
      
      // 2. AuthUtils를 사용하여 세션 확인
      const { session, error } = await AuthUtils.checkSession();
      
      // 타임아웃 클리어
      clearTimeout(authTimeout);
      
      if (error) {
        throw error;
      }
      
      // 3. 세션 유효성 검사
      const isValid = AuthUtils.validateSession(session);
      
      // 4. 인증 결과 처리
      if (isValid && session.user) {
        await this.handleAuthSuccess(session.user);
      } else {
        await this.handleAuthFailure();
      }
      
    } catch (error) {
      clearTimeout(authTimeout);
      console.error('[AUTH_GUARD] 인증 체크 중 오류:', error);
      await this.handleAuthError(error);
    } finally {
      this.authCheckInProgress = false;
      this.isAuthChecked = true;
    }
  }
  
  /**
   * 인증 타임아웃 처리
   */
  handleAuthTimeout() {
    console.warn('[AUTH_GUARD] 인증 체크 타임아웃');
    this.authCheckInProgress = false;
    this.isAuthChecked = true;
    this.handleAuthFailure();
  }
  
  /**
   * 세션 유효성 검사 (AuthUtils 사용)
   */
  validateSession(session) {
    return AuthUtils.validateSession(session);
  }
  
  /**
   * 인증 성공 처리
   */
  async handleAuthSuccess(user) {
    console.log('[AUTH_GUARD] 인증 성공:', user.email);
    
    this.isAuthenticated = true;
    this.currentUserId = user.id;
    
    // 사용자 정보 저장 (안전한 접근)
    if (typeof window.saveUserInfo === 'function') {
      try {
        await window.saveUserInfo(user);
      } catch (error) {
        console.warn('[AUTH_GUARD] 사용자 정보 저장 실패:', error);
      }
    }
    
    // UI 렌더링: TodoApp 표시
    this.renderTodoApp();
  }
  
  /**
   * 인증 실패 처리 (AuthUtils 사용)
   */
  async handleAuthFailure() {
    console.log('[AUTH_GUARD] 인증 실패 또는 로그아웃');
    
    this.isAuthenticated = false;
    this.currentUserId = null;
    
    // AuthUtils를 사용하여 로그아웃 처리
    try {
      await AuthUtils.signOut();
    } catch (error) {
      console.warn('[AUTH_GUARD] 로그아웃 중 오류:', error);
    }
    
    // UI 렌더링: 로그인 화면 표시
    this.renderAuthSection();
  }
  
  /**
   * 인증 오류 처리 (AuthUtils 사용)
   */
  async handleAuthError(error) {
    console.error('[AUTH_GUARD] 인증 오류 처리:', error);
    
    // AuthUtils를 사용하여 네트워크 오류 확인
    if (AuthUtils.isNetworkError(error)) {
      this.showNetworkError();
    } else {
      // 일반적인 인증 실패로 처리 - 명시적으로 로그인 화면 표시
      await this.handleAuthFailure();
    }
  }
  
  /**
   * 네트워크 오류 표시
   */
  showNetworkError() {
    console.warn('[AUTH_GUARD] 네트워크 오류 감지');
    
    // 토스트 메시지 표시 (안전한 접근)
    if (typeof window.ToastManager !== 'undefined' && window.ToastManager.show) {
      window.ToastManager.show(
        '네트워크 연결을 확인하고 새로고침해주세요.', 
        'warning', 
        8000
      );
    } else {
      console.warn('[AUTH_GUARD] ToastManager를 찾을 수 없음, 콘솔 메시지만 표시');
    }
    
    // 로그인 화면으로 폴백
    this.renderAuthSection();
  }
  
  /**
   * Supabase 인증 상태 변경 이벤트 처리
   */
  handleSupabaseAuthChange(event, session) {
    // 이미 체크가 완료된 상태에서만 처리
    if (!this.isAuthChecked) {
      return;
    }
    
    switch (event) {
      case 'SIGNED_IN':
        if (session && session.user) {
          this.handleAuthSuccess(session.user);
        }
        break;
        
      case 'SIGNED_OUT':
        this.handleAuthFailure();
        break;
        
      case 'TOKEN_REFRESHED':
        console.log('[AUTH_GUARD] 토큰 갱신됨');
        // 현재 상태 유지
        break;
        
      default:
        console.log('[AUTH_GUARD] 알 수 없는 인증 이벤트:', event);
    }
  }
  
  /**
   * 로딩 상태 표시
   */
  showLoadingState() {
    console.log('[AUTH_GUARD] 로딩 상태 표시');
    
    // 기존 섹션 숨기기
    this.hideAllSections();
    
    // 로딩 오버레이 생성/표시
    this.createLoadingOverlay();
    this.loadingOverlay.style.display = 'flex';
  }
  
  /**
   * 로딩 오버레이 생성
   */
  createLoadingOverlay() {
    if (this.loadingOverlay) {
      return;
    }
    
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'auth-guard-loading';
    this.loadingOverlay.innerHTML = `
      <div class="auth-guard-loading-content">
        <div class="mdl-spinner mdl-js-spinner is-active"></div>
        <p class="loading-message">인증 상태를 확인하고 있습니다...</p>
      </div>
    `;
    
    // 스타일 적용
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: 'Roboto', sans-serif;
    `;
    
    // 내부 컨텐츠 스타일
    const style = document.createElement('style');
    style.textContent = `
      .auth-guard-loading-content {
        text-align: center;
        padding: 20px;
      }
      .auth-guard-loading-content .loading-message {
        margin-top: 16px;
        color: #666;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(this.loadingOverlay);
    
    // MDL 컴포넌트 업그레이드
    if (typeof componentHandler !== 'undefined') {
      componentHandler.upgradeElement(this.loadingOverlay.querySelector('.mdl-spinner'));
    }
  }
  
  /**
   * 모든 섹션 강제 숨기기
   */
  hideAllSections() {
    console.log('[AUTH_GUARD] 모든 섹션 숨기기');
    
    if (this.authSection) {
      this.authSection.style.display = 'none';
    }
    
    if (this.todoApp) {
      this.todoApp.style.display = 'none'; // 강제로 숨김
      this.todoApp.classList.remove('todo-app-visible');
      this.todoApp.classList.add('todo-app-hidden');
    }
    
    console.log('[AUTH_GUARD] 모든 섹션 숨김 처리 완료');
  }
  
  /**
   * 로딩 상태 숨기기
   */
  hideLoadingState() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }
  
  /**
   * TODO 앱 렌더링 (인증 성공 시)
   */
  renderTodoApp() {
    console.log('[AUTH_GUARD] TODO 앱 렌더링');
    
    this.hideLoadingState();
    
    // 인증 섹션 강제 숨기기
    if (this.authSection) {
      this.authSection.style.display = 'none';
      console.log('[AUTH_GUARD] 인증 섹션 강제 숨김 처리 완료');
    }
    
    // TODO 앱 강제 표시
    if (this.todoApp) {
      this.todoApp.style.display = 'block'; // 강제로 표시
      this.todoApp.classList.remove('todo-app-hidden');
      this.todoApp.classList.add('todo-app-visible');
      console.log('[AUTH_GUARD] TODO 앱 강제 표시 처리 완료');
      
      // TODO 앱 초기화 (전역 함수 호출, 안전한 접근)
      if (typeof window.showTodoApp === 'function') {
        window.showTodoApp(this.currentUserId);
      } else {
        console.warn('[AUTH_GUARD] showTodoApp 함수를 찾을 수 없습니다');
      }
    }
    
    // 상태 로깅
    console.log('[AUTH_GUARD] 렌더링 완료 - 인증 성공 상태:', {
      authSectionDisplay: this.authSection?.style.display,
      todoAppDisplay: this.todoApp?.style.display,
      todoAppClasses: this.todoApp?.className,
      userId: this.currentUserId
    });
  }
  
  /**
   * 인증 섹션 렌더링 (인증 실패 시)
   */
  renderAuthSection() {
    console.log('[AUTH_GUARD] 인증 섹션 렌더링');
    
    this.hideLoadingState();
    
    // TODO 앱 강제 숨기기 (여러 방법으로 확실히 숨김)
    if (this.todoApp) {
      this.todoApp.style.display = 'none'; // 강제로 숨김
      this.todoApp.classList.remove('todo-app-visible');
      this.todoApp.classList.add('todo-app-hidden');
      console.log('[AUTH_GUARD] TODO 앱 강제 숨김 처리 완료');
    }
    
    // 인증 섹션 강제 표시
    if (this.authSection) {
      this.authSection.style.display = 'block'; // 강제로 표시
      console.log('[AUTH_GUARD] 인증 섹션 강제 표시 처리 완료');
      
      // 인증 섹션 초기화 (전역 함수 호출, 안전한 접근)
      if (typeof window.showAuthSection === 'function') {
        window.showAuthSection();
      } else {
        console.warn('[AUTH_GUARD] showAuthSection 함수를 찾을 수 없습니다');
      }
    }
    
    // 상태 로깅
    console.log('[AUTH_GUARD] 렌더링 완료 - 인증 실패 상태:', {
      authSectionDisplay: this.authSection?.style.display,
      todoAppDisplay: this.todoApp?.style.display,
      todoAppClasses: this.todoApp?.className
    });
  }
  
  /**
   * 인증 상태 확인 완료 여부
   */
  isAuthCheckComplete() {
    return this.isAuthChecked;
  }
  
  /**
   * 현재 인증 상태
   */
  getAuthenticationState() {
    return {
      isAuthChecked: this.isAuthChecked,
      isAuthenticated: this.isAuthenticated,
      userId: this.currentUserId,
      authCheckInProgress: this.authCheckInProgress
    };
  }
  
  /**
   * 강제 재인증 체크
   */
  async forceRecheck() {
    console.log('[AUTH_GUARD] 강제 재인증 체크 시작');
    this.isAuthChecked = false;
    await this.checkAuthentication();
  }
}

// 전역 AuthGuard 인스턴스 (main.js에서 사용)
let authGuard = null;

/**
 * AuthGuard 초기화 함수
 */
function initializeAuthGuard() {
  if (authGuard) {
    console.warn('[AUTH_GUARD] 이미 초기화되었습니다');
    return authGuard;
  }
  
  authGuard = new AuthGuard();
  console.log('[AUTH_GUARD] 전역 AuthGuard 인스턴스 생성됨');
  
  return authGuard;
}

/**
 * AuthGuard 인스턴스 반환
 */
function getAuthGuard() {
  if (!authGuard) {
    console.warn('[AUTH_GUARD] AuthGuard가 초기화되지 않았습니다');
    return null;
  }
  
  return authGuard;
}

// ES6 모듈 export
export { AuthGuard, initializeAuthGuard, getAuthGuard };

// 전역 스코프에서도 사용 가능하도록 (안전한 설정)
if (typeof window !== 'undefined') {
  window.AuthGuard = AuthGuard;
  window.initializeAuthGuard = initializeAuthGuard;
  window.getAuthGuard = getAuthGuard;
  
  // ToastManager가 전역으로 필요한 경우를 대비
  if (typeof window.ToastManager === 'undefined') {
    window.ToastManager = {
      show: (message, type = 'error', duration = 5000) => {
        console.log(`[TOAST] ${type.toUpperCase()}: ${message}`);
        alert(message); // 폴백
      }
    };
  }
}
