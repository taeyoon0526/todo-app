/**
 * TODO-LIST Application - Main Script
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/main.js
import { supabase, saveUserInfo } from "./api.js";
import { getDDay, getDDayClass, convertToUTCISO, convertFromUTCISO, isValidDate } from "./utils.js";
import { 
  requestNotificationPermission, 
  startNotificationScheduler, 
  stopNotificationScheduler,
  checkDeadlines,
  getNotificationStatus,
  showTestNotification
} from "./notifications.js";
import { debounce, initializePerformanceOptimizations } from "./performance.js";

// 토스트 메시지 시스템
const ToastManager = {
  show(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.getElementById('toast-message');
    const text = document.getElementById('toast-text');
    const closeBtn = document.getElementById('toast-close');
    
    if (!container || !toast || !text || !closeBtn) {
      console.error('[TOAST] 토스트 메시지 요소를 찾을 수 없습니다');
      // 폴백으로 브라우저 alert 사용
      alert(message);
      return;
    }
    
    // 기존 토스트 제거
    this.hide();
    
    // 메시지 설정
    text.textContent = message;
    
    // 타입별 클래스 설정
    toast.className = `toast-message ${type}`;
    
    // 토스트 표시
    toast.classList.remove('hidden');
    
    console.log(`[TOAST] ${type.toUpperCase()}: ${message}`);
    
    // 자동 숨김
    if (duration > 0) {
      setTimeout(() => {
        this.hide();
      }, duration);
    }
    
    // 닫기 버튼 이벤트
    closeBtn.onclick = () => {
      this.hide();
    };
  },
  
  hide() {
    const toast = document.getElementById('toast-message');
    if (toast) {
      toast.style.animation = 'slideOutToast 0.3s ease-in';
      setTimeout(() => {
        toast.classList.add('hidden');
        toast.style.animation = '';
      }, 300);
    }
  }
};

// 인증 에러 처리 및 사용자 친화적 메시지 시스템
const AuthErrorHandler = {
  // 에러 코드별 메시지 매핑
  errorMessages: {
    // 네트워크 관련 에러
    'Failed to fetch': '네트워크 연결을 확인해주세요. 인터넷 연결 상태를 점검하고 다시 시도해주세요.',
    'Network request failed': '네트워크 요청이 실패했습니다. 연결 상태를 확인하고 다시 시도해주세요.',
    'TypeError: fetch failed': '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
    
    // OAuth 관련 에러
    'OAuth authorization denied': '구글 로그인 권한이 거부되었습니다. 다시 시도하거나 다른 계정을 사용해주세요.',
    'OAuth URL을 받을 수 없습니다': '구글 로그인 설정에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
    'OAuth session expired': '구글 로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    'popup_closed_by_user': '팝업이 닫혔습니다. 로그인을 완료하려면 다시 시도해주세요.',
    
    // 인증 관련 에러  
    'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다. 입력 정보를 확인해주세요.',
    'Email not confirmed': '이메일 인증이 필요합니다. 받은 인증 메일을 확인해주세요.',
    'User already registered': '이미 가입된 이메일입니다. 로그인을 시도해보세요.',
    'Signup disabled': '현재 회원가입이 비활성화되어 있습니다. 관리자에게 문의해주세요.',
    'Too many requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    
    // 세션 관련 에러
    'Session expired': '세션이 만료되었습니다. 다시 로그인해주세요.',
    'Invalid session': '세션이 유효하지 않습니다. 다시 로그인해주세요.',
    'Token refresh failed': '토큰 갱신에 실패했습니다. 다시 로그인해주세요.',
    
    // 기타 에러
    'Unknown error': '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Server error': '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'Service unavailable': '서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.'
  },
  
  // 에러 메시지 추출 및 사용자 친화적 메시지 반환
  getErrorMessage(error) {
    if (!error) return this.errorMessages['Unknown error'];
    
    const errorMessage = error.message || error.error_description || error.error || error.toString();
    
    // 정확한 매칭 우선
    if (this.errorMessages[errorMessage]) {
      return this.errorMessages[errorMessage];
    }
    
    // 부분 매칭 검사
    for (const [key, message] of Object.entries(this.errorMessages)) {
      if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
    
    // 네트워크 에러 패턴 검사
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('connection')) {
      return this.errorMessages['Failed to fetch'];
    }
    
    // OAuth 에러 패턴 검사
    if (errorMessage.includes('oauth') || errorMessage.includes('authorization')) {
      return this.errorMessages['OAuth authorization denied'];
    }
    
    // 기본 에러 메시지
    return `오류가 발생했습니다: ${errorMessage}\n\n문제가 지속되면 고객센터로 문의해주세요.`;
  },
  
  // 에러 표시 (토스트 + 재시도 옵션)
  showError(error, context = '', retryCallback = null) {
    const userMessage = this.getErrorMessage(error);
    
    console.error(`[AUTH_ERROR][${context}]`, error);
    
    // 재시도 가능한 에러인지 확인
    const isRetryable = this.isRetryableError(error);
    
    if (isRetryable && retryCallback) {
      // 재시도 가능한 에러는 토스트에 재시도 버튼 표시
      this.showRetryableError(userMessage, retryCallback, context);
    } else {
      // 일반 에러는 기본 토스트 표시
      ToastManager.show(userMessage, 'error', 8000);
    }
  },
  
  // 재시도 가능한 에러 확인
  isRetryableError(error) {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const retryablePatterns = [
      'network', 'fetch', 'connection', 'timeout', 'server error', 'service unavailable',
      'too many requests', 'oauth url', 'popup_closed'
    ];
    
    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  },
  
  // 재시도 가능한 에러 UI 표시
  showRetryableError(message, retryCallback, context) {
    // 기존 토스트 숨기기
    ToastManager.hide();
    
    // 재시도 버튼이 포함된 커스텀 토스트 생성
    const toast = document.getElementById('toast-message');
    const text = document.getElementById('toast-text');
    
    if (!toast || !text) {
      if (confirm(message + '\n\n다시 시도하시겠습니까?')) {
        retryCallback();
      }
      return;
    }
    
    // 메시지 + 재시도 버튼 HTML 생성
    text.innerHTML = `
      <div class="error-message">${message}</div>
      <div class="error-actions" style="margin-top: 12px;">
        <button class="retry-btn mdl-button mdl-js-button mdl-button--raised mdl-button--colored" 
                style="margin-right: 8px; font-size: 12px; padding: 4px 12px;">
          다시 시도
        </button>
        <button class="contact-btn mdl-button mdl-js-button" 
                style="font-size: 12px; padding: 4px 12px;">
          문의하기
        </button>
      </div>
    `;
    
    // 토스트 표시
    toast.className = 'toast-message error';
    toast.classList.remove('hidden');
    
    // 이벤트 리스너 추가
    const retryBtn = text.querySelector('.retry-btn');
    const contactBtn = text.querySelector('.contact-btn');
    
    if (retryBtn) {
      retryBtn.onclick = () => {
        ToastManager.hide();
        console.log(`[AUTH_ERROR] 재시도 실행: ${context}`);
        retryCallback();
      };
    }
    
    if (contactBtn) {
      contactBtn.onclick = () => {
        ToastManager.hide();
        this.showContactInfo();
      };
    }
    
    // 10초 후 자동 숨김
    setTimeout(() => {
      ToastManager.hide();
    }, 10000);
  },
  
  // 고객센터 안내
  showContactInfo() {
    const contactMessage = `
문제가 지속될 경우 아래 방법으로 문의해주세요:

📧 이메일: support@todoapp.com
🕒 운영시간: 평일 09:00-18:00
🔗 FAQ: https://todoapp.com/faq

문의 시 발생한 시간과 상황을 알려주시면 빠른 해결에 도움이 됩니다.
    `;
    
    ToastManager.show(contactMessage, 'info', 15000);
  }
};

// 세션 상태 관리 및 모니터링 시스템
const SessionManager = {
  checkInterval: null,
  isMonitoring: false,
  
  // 세션 상태 지속적 모니터링 시작
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[SESSION] 세션 모니터링 시작');
    
    // 30초마다 세션 상태 확인
    this.checkInterval = setInterval(async () => {
      await this.validateSession();
    }, 30000);
  },
  
  // 세션 모니터링 중지
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log('[SESSION] 세션 모니터링 중지');
  },
  
  // 세션 유효성 검사
  async validateSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[SESSION] 세션 확인 오류:', error);
        
        // 네트워크 오류인지 확인
        if (error.message && (error.message.includes('fetch') || error.message.includes('network'))) {
          // 네트워크 오류는 재시도 가능한 에러로 처리
          console.warn('[SESSION] 네트워크 오류로 인한 세션 확인 실패, 재시도 대기');
          return true; // 네트워크 오류시 세션을 유지하고 다음 체크를 기다림
        } else {
          // 다른 세션 오류는 만료로 처리
          this.handleSessionExpired('세션 확인 중 오류가 발생했습니다.');
          return false;
        }
      }
      
      if (!session || !session.user) {
        console.warn('[SESSION] 세션이 만료되었습니다');
        this.handleSessionExpired('세션이 만료되었습니다. 다시 로그인해주세요.');
        return false;
      }
      
      // 토큰 만료 시간 확인
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at <= now) {
        console.warn('[SESSION] 토큰이 만료되었습니다');
        this.handleSessionExpired('인증 토큰이 만료되었습니다. 다시 로그인해주세요.');
        return false;
      }
      
      // 토큰 만료 30분 전 알림
      if (session.expires_at && (session.expires_at - now) <= 1800) {
        console.warn('[SESSION] 토큰이 곧 만료됩니다');
        ToastManager.show('세션이 곧 만료됩니다. 작업을 저장해주세요.', 'warning', 8000);
      }
      
      return true;
      
    } catch (error) {
      console.error('[SESSION] 세션 검증 예외:', error);
      
      // 네트워크 관련 예외인지 확인
      if (error.name === 'TypeError' || error.message.includes('fetch') || !navigator.onLine) {
        console.warn('[SESSION] 네트워크 예외로 인한 세션 검증 실패, 재시도 대기');
        return true; // 네트워크 예외시 세션을 유지
      } else {
        // 다른 예외는 세션 만료로 처리
        this.handleSessionExpired('세션 검증 중 예상치 못한 오류가 발생했습니다.');
        return false;
      }
    }
  },
  
  // 세션 만료 처리
  handleSessionExpired(message = '세션이 만료되었습니다. 다시 로그인해주세요.') {
    console.warn('[SESSION] 세션 만료 처리:', message);
    
    // 모니터링 중지
    this.stopMonitoring();
    
    // 로컬 스토리지 정리
    clearLocalStorage();
    
    // 토스트 메시지 표시
    ToastManager.show(message, 'error', 0); // 사용자가 직접 닫을 때까지 표시
    
    // Supabase 세션 정리 (오류 무시)
    supabase.auth.signOut().catch(error => {
      console.warn('[SESSION] 로그아웃 중 오류 (무시):', error);
    });
    
    // 로그인 화면으로 이동
    setTimeout(() => {
      showAuthSection();
    }, 1000);
  },
  
  // 강제 세션 갱신 시도
  async refreshSession() {
    try {
      console.log('[SESSION] 세션 갱신 시도');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.error('[SESSION] 세션 갱신 실패:', error);
        this.handleSessionExpired('세션 갱신에 실패했습니다. 다시 로그인해주세요.');
        return false;
      }
      
      console.log('[SESSION] 세션 갱신 성공');
      ToastManager.show('세션이 갱신되었습니다.', 'success', 3000);
      return true;
      
    } catch (error) {
      console.error('[SESSION] 세션 갱신 예외:', error);
      this.handleSessionExpired('세션 갱신 중 오류가 발생했습니다.');
      return false;
    }
  }
};

window.addEventListener("DOMContentLoaded", async () => {
  // 성능 최적화 초기화
  initializePerformanceOptimizations();
  
  // MDL 컴포넌트 업그레이드 확인
  if (typeof componentHandler !== 'undefined') {
    componentHandler.upgradeDom();
  }
  
  // 초기 세션 확인 및 유효성 검사
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[INIT] 초기 세션 확인 오류:', error);
      showAuthSection();
      return;
    }
    
    if (session && session.user) {
      // 세션이 존재하면 유효성 검사
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at <= now) {
        console.warn('[INIT] 만료된 세션 감지, 로그인 화면으로 이동');
        await supabase.auth.signOut();
        showAuthSection();
        return;
      }
      
      console.log('[INIT] 유효한 세션 감지, 메인 화면으로 이동');
      showTodoApp(session.user.id);
    } else {
      console.log('[INIT] 세션 없음, 로그인 화면 표시');
      showAuthSection();
    }
  } catch (error) {
    console.error('[INIT] 세션 초기화 중 예외:', error);
    showAuthSection();
  }
  
  // Auth 상태 변화 리스너 추가 (즉시 반응형)
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      console.log("[DEBUG] Auth state changed:", event, session);
      
      if (event === 'SIGNED_IN' && session && session.user) {
        console.log("[INFO] 즉시 로그인 감지! 사용자:", session.user.email);
        
        try {
          // 사용자 정보 DB에 저장 (upsert)
          const saveResult = await saveUserInfo(session.user);
          if (!saveResult.success) {
            console.warn("[WARN] 사용자 정보 저장 실패, 계속 진행:", saveResult.error);
            // 사용자 정보 저장 실패는 치명적이지 않으므로 계속 진행
          }
        } catch (userSaveError) {
          console.error("[ERROR] 사용자 정보 저장 중 예외:", userSaveError);
          // 계속 진행하되 에러 로그만 남김
        }
        
        // 사용자 정보 저장 후 즉시 메인 화면으로 이동 (사용자 경험 개선)
        showTodoApp(session.user.id);
        
      } else if (event === 'SIGNED_OUT') {
        console.log("[INFO] 로그아웃 감지, 로그인 화면으로 이동");
        showAuthSection();
        
      } else if (event === 'TOKEN_REFRESHED') {
        if (session && session.user) {
          console.log("[INFO] 토큰 갱신 성공");
          // 이미 TODO 앱이 표시되어 있지 않다면 표시
          const todoApp = document.getElementById("todo-app");
          if (todoApp && todoApp.classList.contains("todo-app-hidden")) {
            showTodoApp(session.user.id);
          }
        } else {
          console.log("[INFO] 토큰 갱신 실패, 로그인 화면으로 이동");
          AuthErrorHandler.showError(
            new Error('Token refresh failed'), 
            'TOKEN_REFRESH',
            () => showAuthSection()
          );
          showAuthSection();
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log("[INFO] 비밀번호 복구 이벤트");
        ToastManager.show('비밀번호 복구 이메일을 확인해주세요.', 'info', 5000);
        
      } else if (event === 'USER_UPDATED') {
        console.log("[INFO] 사용자 정보 업데이트");
        
      } else {
        // 알 수 없는 이벤트 처리
        console.warn("[WARN] 알 수 없는 인증 이벤트:", event);
      }
      
    } catch (error) {
      console.error("[ERROR] Auth state change 처리 중 예외:", error);
      
      // 치명적인 인증 상태 변화 에러 처리
      AuthErrorHandler.showError(error, 'AUTH_STATE_CHANGE');
      
      // 안전을 위해 로그인 화면으로 이동
      showAuthSection();
    }
  });
  
  // 추가적인 세션 상태 모니터링 (팝업 로그인 완료 감지용)
  let sessionCheckInterval;
  
  window.addEventListener('focus', async () => {
    const currentAuthSection = document.getElementById("auth-section");
    
    // 로그인 화면이 표시되어 있을 때만 세션 체크
    if (currentAuthSection.style.display !== "none") {
      console.log("[DEBUG] 윈도우 포커스 - 세션 상태 즉시 확인");
      
      // 기존 인터벌 제거
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
      
      // 짧은 간격으로 여러 번 체크 (팝업 로그인 완료 즉시 감지)
      let checkCount = 0;
      sessionCheckInterval = setInterval(async () => {
        checkCount++;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log("[INFO] 포커스 이벤트로 로그인 감지됨!");
          clearInterval(sessionCheckInterval);
          showTodoApp(session.user.id);
        } else if (checkCount >= 10) {
          // 10회 체크 후 중단
          clearInterval(sessionCheckInterval);
        }
      }, 500); // 0.5초마다 체크
      
      // 5초 후 인터벌 자동 중단
      setTimeout(() => {
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
        }
      }, 5000);
    }
  });
});

// 인증 섹션으로 돌아가기
function showAuthSection() {
  const authSection = document.getElementById("auth-section");
  const todoApp = document.getElementById("todo-app");
  const logoutButton = document.getElementById("logout-button");
  
  // 세션 모니터링 중지 (로그아웃 시)
  SessionManager.stopMonitoring();
  
  authSection.style.display = "block";
  todoApp.classList.remove("todo-app-visible");
  todoApp.classList.add("todo-app-hidden");
  
  // 로그아웃 버튼 숨기기
  if (logoutButton) {
    logoutButton.classList.remove("visible");
  }
}

// 로그인 성공 시 todo-app 표시 및 할 일 목록 불러오기
window.addEventListener("login-success", (e) => {
  const userId = e.detail.user.id;
  console.log("[INFO] 로그인 성공, 메인 화면으로 이동합니다. User ID:", userId);
  showTodoApp(userId);
});

function showTodoApp(userId) {
  const authSection = document.getElementById("auth-section");
  const todoApp = document.getElementById("todo-app");
  const logoutButton = document.getElementById("logout-button");
  
  // 빠른 화면 전환 (성능 최적화)
  authSection.style.display = "none";
  todoApp.classList.remove("todo-app-hidden");
  todoApp.classList.add("todo-app-visible");
  
  // 로그아웃 버튼 표시
  if (logoutButton) {
    logoutButton.classList.add("visible");
  }
  
  // 세션 모니터링 시작 (인증 상태 유지 및 만료 감지)
  SessionManager.startMonitoring();
  
  // 완료 보기 토글 버튼 이벤트 리스너 설정
  setupCompletedToggle(userId);
  
  // 우선순위 정렬 버튼 이벤트 리스너 설정
  setupPrioritySortButton(userId);
  
  // 모바일 FAB 및 모달 설정
  setupMobileFAB(userId);
  
  // 로그아웃 버튼 이벤트 리스너 설정
  setupLogoutButton();
  
  // 알림 시스템 초기화
  setupNotificationSystem(userId);
  
  // 필터링 시스템 초기화
  setupFilteringSystem(userId);
  
  // 검색 기능 초기화
  setupSearchSystem(userId);
  
  // 할 일 목록 비동기 로드 (UI 차단 방지)
  loadTodos(userId).catch(error => {
    console.error("할 일 목록 로드 실패:", error);
  });
}

// 공통 에러 처리 함수
function handleAuthError(error) {
  if (!error) return false;
  
  // JWT 토큰 관련 오류 처리
  if (error.code === "401" || error.code === "403" || 
      error.message?.includes("JWT") || 
      error.message?.includes("permission denied") ||
      error.message?.includes("access_token")) {
    console.error("[AUTH ERROR]", error);
    alert("세션이 만료되었거나 권한이 없습니다. 다시 로그인 해주세요.");
    // Supabase 세션 정리 및 로그인 화면으로 이동
    supabase.auth.signOut();
    showAuthSection();
    return true;
  }
  
  // 네트워크 오류
  if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
    console.error("[NETWORK ERROR]", error);
    alert("네트워크 연결을 확인해주세요.");
    return true;
  }
  
  return false;
}

// 로딩 상태 표시
function showLoading() {
  const list = document.getElementById("todo-list");
  list.innerHTML = '<li class="todo-item loading-item">로딩 중...</li>';
}

// 필터 버튼 이벤트 (디바운싱 적용) - setupFilteringSystem에서 처리됨
// const filterBtns = document.querySelectorAll(".filter-btn");
// const debouncedFilter = debounce(async () => {
//   const { data: { session } } = await supabase.auth.getSession();
//   if (session && session.user) {
//     showLoading();
//     await loadTodos(session.user.id);
//   }
// }, 150);

// filterBtns.forEach((btn) => {
//   btn.addEventListener("click", () => {
//     currentFilter = btn.dataset.filter;
//     filterBtns.forEach((b) => b.classList.remove("active"));
//     btn.classList.add("active");
//     debouncedFilter();
//   });
// });

// 할 일 추가 폼 이벤트 (마감일, 우선순위 포함)
const addForm = document.getElementById("todo-add-form");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("todo-input");
    const dueInput = document.getElementById("todo-due");
    const prioInput = document.getElementById("todo-priority");
    const title = input.value.trim();
    const dueDateLocal = dueInput.value || null;
    const priority = prioInput.value;
    
    if (!title) return;
    
    // 마감일 유효성 검사
    if (dueDateLocal && !isValidDate(dueDateLocal)) {
      alert("올바른 날짜를 입력해주세요.");
      return;
    }
    
    // 마감일을 UTC ISO 형식으로 변환
    const due_date = dueDateLocal ? convertToUTCISO(dueDateLocal) : null;
    
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert("로그인 후 이용하세요.");
      return;
    }
    
    const { error } = await supabase.from("todos").insert({
      user_id: session.user.id,
      title,
      status: 'pending', // status 컬럼 사용
      due_date,
      priority,
    });
    
    if (handleAuthError(error)) return;
    if (error) {
      alert("추가 실패: " + error.message);
      return;
    }
    
    input.value = "";
    dueInput.value = "";
    prioInput.value = "중간";
    
    // MDL 텍스트필드 초기화
    const textfields = document.querySelectorAll('.mdl-textfield');
    textfields.forEach(field => {
      if (field.MaterialTextfield) {
        field.MaterialTextfield.checkDirty();
      }
    });
    
    await loadTodos(session.user.id);
  });
}

export async function loadTodos(userId) {
  const todoList = document.getElementById("todo-list");
  
  // 로딩 중이 아닌 경우에만 로딩 표시
  if (!todoList.innerHTML.includes('로딩 중...')) {
    showLoading();
  }
  
  let query = supabase.from("todos").select("*").eq("user_id", userId);
  // 필터 적용
  if (currentFilter === "today") {
    const todayStr = new Date().toISOString().slice(0, 10);
    query = query.gte("due_date", todayStr).lte("due_date", todayStr);
  } else if (currentFilter === "week") {
    // 이번 주 필터: 이번 주 월요일부터 일요일까지
    const now = new Date();
    const currentDay = now.getDay(); // 0(일) ~ 6(토)
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // 월요일까지의 일수
    
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);
    
    query = query.gte("due_date", mondayStr).lte("due_date", sundayStr);
  }
  // 우선순위 정렬(높음>중간>낮음), 마감일 오름차순, 생성일 내림차순
  let queryWithSort = query;
  
  if (currentSort === "priority") {
    // 우선순위 정렬: 높음(1) -> 중간(2) -> 낮음(3) 순서로 매핑하여 정렬
    queryWithSort = queryWithSort.order("priority", { ascending: sortDirection === "asc" });
  }
  
  const { data, error } = await queryWithSort
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
    
  todoList.innerHTML = "";
  
  if (handleAuthError(error)) return;
  if (error) {
    todoList.innerHTML = '<li class="todo-item error-item">불러오기 실패: ' + error.message + '</li>';
    return;
  }
  
  // 클라이언트 사이드 필터링 (검색 및 고급 필터)
  let filteredData = data;
  
  // 검색 필터 적용
  if (currentSearchQuery) {
    filteredData = searchTodos(filteredData, currentSearchQuery);
  }
  
  // 추가 필터 적용 (DB 필터로 처리되지 않은 것들)
  if (currentFilter !== 'all' && currentFilter !== 'today' && currentFilter !== 'week') {
    filteredData = filterTodos(filteredData, currentFilter);
  }
  
  if (filteredData.length === 0) {
    const emptyMessage = currentSearchQuery ? 
      `"${currentSearchQuery}"에 대한 검색 결과가 없습니다.` : 
      '할 일이 없습니다.';
    todoList.innerHTML = `<li class="todo-item empty-item">${emptyMessage}</li>`;
    return;
  }
  
  for (const todo of filteredData) {
    const li = document.createElement("li");
    li.className = `todo-item priority-${todo.priority || '중간'}`;
    
    // 완료된 항목인지 확인 (status === 'completed')
    const isCompleted = todo.status === 'completed';
    
    // 완료된 항목에 completed 클래스 추가
    if (isCompleted) {
      li.classList.add('completed');
    }
    
    // 체크박스
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = isCompleted;
    checkbox.addEventListener("change", async () => {
      const newStatus = checkbox.checked ? 'completed' : 'pending';
      const { error } = await supabase
        .from("todos")
        .update({ status: newStatus })
        .eq("id", todo.id);
      if (handleAuthError(error)) return;
      await loadTodos(userId);
    });
    li.appendChild(checkbox);
    
    // 콘텐츠 컨테이너
    const content = document.createElement("div");
    content.className = "todo-content";
    
    // 제목
    const titleEl = document.createElement("p");
    titleEl.className = `todo-text${isCompleted ? ' completed' : ''}`;
    titleEl.textContent = todo.title;
    
    // 더블클릭으로 편집 기능 추가
    titleEl.addEventListener("dblclick", () => {
      if (isCompleted) return; // 완료된 항목은 편집 불가
      editTodoInline(titleEl, todo, userId);
    });
    
    content.appendChild(titleEl);
    
    // 메타 정보 (마감일, 우선순위)
    if (todo.due_date || todo.priority) {
      const meta = document.createElement("div");
      meta.className = "todo-meta";
      
      // 마감일 D-Day
      if (todo.due_date) {
        const dday = document.createElement("span");
        const ddayText = getDDay(todo.due_date);
        const ddayClass = getDDayClass(ddayText);
        dday.className = `todo-due ${ddayClass}`;
        dday.textContent = ddayText;
        meta.appendChild(dday);
      }
      
      // 우선순위
      if (todo.priority) {
        const priority = document.createElement("span");
        priority.className = `todo-priority priority-${todo.priority}`;
        priority.textContent = todo.priority;
        meta.appendChild(priority);
      }
      
      content.appendChild(meta);
    }
    
    li.appendChild(content);
    
    // 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.className = "todo-delete";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", async () => {
      if (confirm("정말 삭제하시겠습니까?")) {
        const { error } = await supabase.from("todos").delete().eq("id", todo.id);
        if (handleAuthError(error)) return;
        if (error) {
          alert("삭제 실패: " + error.message);
          return;
        }
        await loadTodos(userId);
      }
    });
    li.appendChild(delBtn);
    
    todoList.appendChild(li);
  }
}

// 완료 보기 토글 설정
function setupCompletedToggle(userId) {
  const toggleBtn = document.getElementById("toggle-completed");
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener("click", () => {
    const isShowingCompleted = toggleBtn.getAttribute("data-toggle") === "true";
    const newToggleState = !isShowingCompleted;
    
    toggleBtn.setAttribute("data-toggle", newToggleState.toString());
    toggleBtn.textContent = newToggleState ? "완료 숨기기" : "완료 보기";
    
    // 완료 항목 표시/숨김 처리
    toggleCompletedItems(newToggleState);
  });
}

// 완료된 항목 표시/숨김 토글
function toggleCompletedItems(showCompleted) {
  const todoItems = document.querySelectorAll(".todo-item");
  
  todoItems.forEach(item => {
    const isCompleted = item.classList.contains("completed");
    
    if (isCompleted) {
      if (showCompleted) {
        item.style.display = "flex"; // 완료 항목 보이기
        item.style.opacity = "0.7"; // 약간 흐리게 표시
      } else {
        item.style.display = "none"; // 완료 항목 숨기기
      }
    }
  });
}

// 인라인 편집 기능
async function editTodoInline(titleEl, todo, userId) {
  const originalText = titleEl.textContent;
  
  // 입력 필드 생성
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalText;
  input.className = "todo-edit-input";
  input.style.cssText = `
    width: 100%;
    border: 2px solid #6c63ff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: inherit;
    font-family: inherit;
    background: #fff;
  `;
  
  // 텍스트 요소를 입력 필드로 교체
  titleEl.style.display = "none";
  titleEl.parentNode.insertBefore(input, titleEl);
  input.focus();
  input.select();
  
  // 편집 완료 처리
  const finishEdit = async (save = true) => {
    const newTitle = input.value.trim();
    
    if (save && newTitle && newTitle !== originalText) {
      // 제목 업데이트
      const { error } = await supabase
        .from("todos")
        .update({ title: newTitle })
        .eq("id", todo.id);
        
      if (handleAuthError(error)) {
        input.remove();
        titleEl.style.display = "";
        return;
      }
      
      if (error) {
        alert("수정 실패: " + error.message);
        input.remove();
        titleEl.style.display = "";
        return;
      }
      
      titleEl.textContent = newTitle;
    }
    
    // UI 복원
    input.remove();
    titleEl.style.display = "";
    
    // 변경사항이 있었다면 목록 새로고침
    if (save && newTitle && newTitle !== originalText) {
      await loadTodos(userId);
    }
  };
  
  // 이벤트 리스너
  input.addEventListener("blur", () => finishEdit(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishEdit(false);
    }
  });
}

// 로그아웃 버튼 설정
function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-button");
  if (!logoutButton) return;
  
  // 기존 이벤트 리스너 제거 (중복 방지)
  logoutButton.removeEventListener("click", handleLogout);
  
  // 로그아웃 이벤트 리스너 추가
  logoutButton.addEventListener("click", handleLogout);
}

// 로그아웃 처리 함수
async function handleLogout() {
  try {
    console.log("[INFO] 로그아웃 시작");
    
    // 사용자 확인
    if (!confirm("로그아웃 하시겠습니까?")) {
      return;
    }
    
    // Supabase 로그아웃 API 호출
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("[ERROR] 로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다: " + error.message);
      return;
    }
    
    // 로컬 스토리지 및 세션 스토리지 정리
    clearLocalStorage();
    
    console.log("[INFO] 로그아웃 완료");
    
    // 로그인 페이지로 리다이렉트
    showAuthSection();
    
  } catch (error) {
    console.error("[ERROR] 로그아웃 처리 중 예외:", error);
    alert("로그아웃 중 예상치 못한 오류가 발생했습니다.");
  }
}

// 로컬/세션 스토리지 정리
function clearLocalStorage() {
  try {
    // Supabase 관련 스토리지 정리
    const keysToRemove = [];
    
    // localStorage에서 Supabase 관련 키 찾기
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
        keysToRemove.push(key);
      }
    }
    
    // 찾은 키들 삭제
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[INFO] localStorage에서 ${key} 삭제됨`);
    });
    
    // sessionStorage도 정리
    sessionStorage.clear();
    console.log("[INFO] sessionStorage 정리 완료");
    
  } catch (error) {
    console.error("[ERROR] 스토리지 정리 실패:", error);
  }
}

// 우선순위 정렬 버튼 설정
function setupPrioritySortButton(userId) {
  const sortBtn = document.getElementById("sort-priority");
  if (!sortBtn) return;
  
  // 초기 버튼 상태 설정
  updateSortButtonText();
  
  sortBtn.addEventListener("click", async () => {
    // 정렬 방향 토글
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    
    // 버튼 텍스트 업데이트
    updateSortButtonText();
    
    // 할 일 목록 새로고침
    showLoading();
    await loadTodos(userId);
  });
}

// 정렬 버튼 텍스트 업데이트
function updateSortButtonText() {
  const sortBtn = document.getElementById("sort-priority");
  if (!sortBtn) return;

  const icon = sortDirection === "asc" ? "arrow_upward" : "arrow_downward";
  const text = sortDirection === "asc" ? "높은 우선순위" : "낮은 우선순위";
  sortBtn.innerHTML = `<i class="material-icons">${icon}</i> ${text}`;
  sortBtn.classList.add("active");
}

// 모바일 FAB 및 모달 설정
function setupMobileFAB(userId) {
  const fab = document.getElementById("mobile-fab");
  const modal = document.getElementById("mobile-add-modal");
  const form = document.getElementById("mobile-add-form");
  const cancelBtn = document.getElementById("mobile-cancel-btn");
  
  if (!fab || !modal || !form || !cancelBtn) return;
  
  // FAB 클릭 시 모달 열기
  fab.addEventListener("click", () => {
    modal.classList.add("active");
    document.getElementById("mobile-todo-input").focus();
  });
  
  // 취소 버튼 및 배경 클릭 시 모달 닫기
  cancelBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  
  // ESC 키로 모달 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });
  
  function closeModal() {
    modal.classList.remove("active");
    form.reset();
  }
  
  // 모바일 폼 제출 처리
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const input = document.getElementById("mobile-todo-input");
    const dueInput = document.getElementById("mobile-todo-due");
    const prioInput = document.getElementById("mobile-todo-priority");
    
    const title = input.value.trim();
    const dueDateLocal = dueInput.value || null;
    const priority = prioInput.value;
    
    if (!title) return;
    
    // 마감일 유효성 검사
    if (dueDateLocal && !isValidDate(dueDateLocal)) {
      alert("올바른 날짜를 입력해주세요.");
      return;
    }
    
    // 마감일을 UTC ISO 형식으로 변환
    const due_date = dueDateLocal ? convertToUTCISO(dueDateLocal) : null;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert("로그인 후 이용하세요.");
      return;
    }
    
    const { error } = await supabase.from("todos").insert({
      user_id: session.user.id,
      title,
      status: 'pending',
      due_date,
      priority,
    });
    
    if (handleAuthError(error)) return;
    if (error) {
      alert("추가 실패: " + error.message);
      return;
    }
    
    closeModal();
    await loadTodos(userId);
  });
}

// 전역 함수로 노출 (index.html에서 접근 가능하도록)
window.showTodoApp = showTodoApp;
window.showNotificationSettings = showNotificationSettings;

// 알림 시스템 전역 변수
let notificationScheduler = null;

// 검색 및 필터링 전역 변수
let currentSearchQuery = '';
let currentFilter = 'all';
let currentSort = 'priority';
let sortDirection = 'asc';

// 알림 시스템 초기화
async function setupNotificationSystem(userId) {
  console.log('[NOTIFICATIONS] 알림 시스템 초기화 시작');
  
  // 알림 권한 요청
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('[NOTIFICATIONS] 알림 권한이 없습니다.');
    return;
  }
  
  // 기존 스케줄러 정리
  if (notificationScheduler) {
    stopNotificationScheduler(notificationScheduler);
  }
  
  // 마감일 체크 이벤트 리스너
  window.addEventListener('check-deadlines', async () => {
    try {
      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');
      
      if (error) {
        console.error('[NOTIFICATIONS] 할 일 목록 조회 실패:', error);
        return;
      }
      
      checkDeadlines(todos);
    } catch (error) {
      console.error('[NOTIFICATIONS] 마감일 체크 중 오류:', error);
    }
  });
  
  // 알림 스케줄러 시작 (30분마다)
  notificationScheduler = startNotificationScheduler(30 * 60 * 1000);
  
  console.log('[NOTIFICATIONS] 알림 시스템 초기화 완료');
}

// 알림 설정 페이지 표시
function showNotificationSettings() {
  const status = getNotificationStatus();
  
  let message = '🔔 알림 설정\n\n';
  message += `브라우저 지원: ${status.supported ? '✅' : '❌'}\n`;
  message += `권한 상태: ${status.permission}\n`;
  
  if (status.supported) {
    if (status.permission === 'granted') {
      message += '\n✅ 알림이 활성화되어 있습니다!\n';
      message += '• 마감일 당일: D-Day 알림\n';
      message += '• 1시간 전: 긴급 알림\n';
      message += '• 내일 마감: 미리 알림\n\n';
      message += '테스트 알림을 받아보시겠습니까?';
      
      if (confirm(message)) {
        showTestNotification();
      }
    } else if (status.permission === 'denied') {
      message += '\n❌ 알림이 차단되었습니다.\n';
      message += '브라우저 설정에서 알림을 허용해주세요.';
      alert(message);
    } else {
      message += '\n알림을 활성화하시겠습니까?';
      if (confirm(message)) {
        requestNotificationPermission().then(granted => {
          if (granted) {
            alert('✅ 알림이 활성화되었습니다!');
          } else {
            alert('❌ 알림 권한이 거부되었습니다.');
          }
        });
      }
    }
  } else {
    message += '\n이 브라우저는 알림을 지원하지 않습니다.';
    alert(message);
  }
}

// 필터링 시스템 초기화
function setupFilteringSystem(userId) {
  console.log('[FILTER] 필터링 시스템 초기화');
  
  // 디바운스된 필터 함수 생성
  const debouncedFilter = debounce(async () => {
    showLoading();
    await loadTodos(userId);
  }, 150);
  
  // 모든 필터 버튼에 이벤트 리스너 추가
  const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  filterButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const filter = e.target.getAttribute('data-filter');
      setCurrentFilter(filter, userId, debouncedFilter);
    });
  });
  
  // 필터 상태 초기화
  setCurrentFilter('all', userId, debouncedFilter);
}

// 현재 필터 설정
function setCurrentFilter(filter, userId, debouncedFilter = null) {
  currentFilter = filter;
  
  // 모든 필터 버튼의 활성 상태 초기화
  const filterButtons = document.querySelectorAll('.filter-btn[data-filter]');
  filterButtons.forEach(button => {
    button.classList.remove('active');
  });
  
  // 현재 필터 버튼 활성화
  const activeButton = document.querySelector(`[data-filter="${filter}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  console.log(`[FILTER] 필터 변경: ${filter}`);
  
  // 할 일 목록 다시 로드 (디바운스 적용)
  if (debouncedFilter) {
    debouncedFilter();
  } else {
    loadTodos(userId);
  }
}

// 고급 필터링 함수
function filterTodos(todos, filter) {
  const now = new Date();
  
  switch (filter) {
    case 'today':
      return todos.filter(todo => {
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateOnly.getTime() === today.getTime();
      });
      
    case 'week':
      return todos.filter(todo => {
        if (!todo.due_date) return false;
        const dueDate = new Date(todo.due_date);
        
        // 이번 주 월요일부터 일요일까지
        const currentDay = now.getDay(); // 0(일) ~ 6(토)
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
        
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        
        return dueDate >= monday && dueDate <= sunday;
      });
      
    case 'overdue':
      return todos.filter(todo => {
        if (!todo.due_date || todo.status === 'completed') return false;
        const dueDate = new Date(todo.due_date);
        return dueDate < now;
      });
      
    case 'priority-high':
      return todos.filter(todo => todo.priority === '높음');
      
    case 'priority-medium':
      return todos.filter(todo => todo.priority === '중간');
      
    case 'priority-low':
      return todos.filter(todo => todo.priority === '낮음');
      
    case 'completed':
      return todos.filter(todo => todo.status === 'completed');
      
    case 'pending':
      return todos.filter(todo => todo.status === 'pending');
      
    case 'all':
    default:
      return todos;
  }
}

// 검색 시스템 초기화
function setupSearchSystem(userId) {
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.id = 'todo-search';
  searchInput.className = 'mdl-textfield__input';
  searchInput.placeholder = '할 일 검색...';
  
  const searchContainer = document.createElement('div');
  searchContainer.className = 'mdl-textfield mdl-js-textfield mdl-textfield--floating-label search-container';
  
  const searchLabel = document.createElement('label');
  searchLabel.className = 'mdl-textfield__label';
  searchLabel.setAttribute('for', 'todo-search');
  searchLabel.textContent = '할 일 검색';
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(searchLabel);
  
  // 필터 버튼 컨테이너 앞에 검색 박스 삽입
  const filterContainer = document.querySelector('.filter-container');
  if (filterContainer) {
    filterContainer.parentNode.insertBefore(searchContainer, filterContainer);
    
    // MDL 컴포넌트 업그레이드
    if (typeof componentHandler !== 'undefined') {
      componentHandler.upgradeElement(searchContainer);
    }
  }
  
  // 디바운스된 검색 함수
  const debouncedSearch = debounce((query) => {
    currentSearchQuery = query.toLowerCase().trim();
    loadTodos(userId);
  }, 300);
  
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
  
  console.log('[SEARCH] 검색 시스템 초기화 완료');
}

// 검색 필터링 함수
function searchTodos(todos, query) {
  if (!query) return todos;
  
  return todos.filter(todo => {
    return todo.title.toLowerCase().includes(query) ||
           (todo.description && todo.description.toLowerCase().includes(query)) ||
           (todo.priority && todo.priority.toLowerCase().includes(query));
  });
}

// 구글 OAuth 처리 함수 (완전 팝업 전용)
// *** SUPABASE 설정 필요 ***
// 1. Supabase Dashboard → Authentication → Providers → Google 활성화
// 2. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
// 3. 승인된 JavaScript 출처: http://localhost:8000, https://yourdomain.com
// 4. 승인된 리디렉션 URI: https://your-project.supabase.co/auth/v1/callback
async function handleGoogleAuth() {
  try {
    console.log('[AUTH] 구글 OAuth 팝업 로그인 시도');
    
    // 네트워크 연결 상태 확인
    if (!navigator.onLine) {
      throw new Error('Network request failed');
    }
    
    // 팝업 전용 - 메인 페이지 리다이렉션 방지
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 팝업 전용 설정 - 메인 페이지 리다이렉션 완전 차단
        skipBrowserRedirect: true,
        redirectTo: `${window.location.origin}`
      }
    });
    
    if (error) {
      console.error('[AUTH] 구글 로그인 오류:', error);
      throw error;
    }
    
    // OAuth URL을 팝업에서만 열기
    if (data?.url) {
      const popup = window.open(
        data.url, 
        'google-login', 
        'width=480,height=640,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,status=no,location=no'
      );
      
      if (!popup) {
        const popupError = new Error('popup_closed_by_user');
        popupError.userMessage = '팝업이 차단되었습니다. 팝업 차단을 해제하고 다시 시도해주세요.';
        throw popupError;
      }
      
      console.log('[AUTH] 구글 OAuth 팝업 열림');
      
      // 팝업 상태 모니터링 (향상된 방식)
      return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            // 먼저 세션 상태를 확인 (로그인 성공 즉시 감지)
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session && session.user) {
              console.log('[AUTH] 구글 로그인 성공! 사용자:', session.user.email);
              
              // 로그인 성공 시 즉시 팝업 닫기
              if (!popup.closed) {
                popup.close();
                console.log('[AUTH] 로그인 성공으로 팝업 자동 닫기');
              }
              
              clearInterval(checkInterval);
              
              // 사용자 정보 저장
              const saveResult = await saveUserInfo(session.user);
              if (!saveResult.success) {
                console.warn("[WARN] 구글 로그인 - 사용자 정보 저장 실패:", saveResult.error);
              }
              
              showTodoApp(session.user.id);
              resolve(true);
              return;
            }
            
            // 팝업이 닫혔는지 확인
            if (popup.closed) {
              clearInterval(checkInterval);
              console.log('[AUTH] 팝업이 닫혔습니다. 세션 상태 확인 중...');
              
              // 세션 상태 확인 (여러 번 시도)
              let attempts = 0;
              const maxAttempts = 3; // 시도 횟수 줄임
              
              const checkSession = async () => {
                attempts++;
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session && session.user) {
                  console.log('[AUTH] 지연된 로그인 감지! 사용자:', session.user.email);
                  showTodoApp(session.user.id);
                  resolve(true);
                } else if (attempts < maxAttempts) {
                  console.log(`[AUTH] 세션 확인 시도 ${attempts}/${maxAttempts}`);
                  setTimeout(checkSession, 500); // 간격을 500ms로 줄임
                } else {
                  console.log('[AUTH] 로그인이 완료되지 않았습니다');
                  const cancelError = new Error('popup_closed_by_user');
                  AuthErrorHandler.showError(cancelError, 'GOOGLE_AUTH_CANCELLED');
                  resolve(false);
                }
              };
              
              // 즉시 첫 번째 세션 확인
              checkSession();
              return;
            }
          } catch (error) {
            console.error('[AUTH] 팝업 모니터링 오류:', error);
            clearInterval(checkInterval);
            AuthErrorHandler.showError(error, 'POPUP_MONITORING', () => handleGoogleAuth());
            resolve(false);
          }
        }, 200); // 체크 간격을 200ms로 더 빠르게
        
        // 5분 후 타임아웃
        setTimeout(() => {
          if (!popup.closed) {
            popup.close();
          }
          clearInterval(checkInterval);
          console.log('[AUTH] 로그인 타임아웃');
          const timeoutError = new Error('OAuth session expired');
          AuthErrorHandler.showError(timeoutError, 'OAUTH_TIMEOUT', () => handleGoogleAuth());
          resolve(false);
        }, 300000);
      });
      
    } else {
      throw new Error('OAuth URL을 받을 수 없습니다');
    }
    
  } catch (error) {
    console.error('[AUTH] 구글 OAuth 오류:', error);
    
    // 사용자 친화적 에러 처리
    AuthErrorHandler.showError(error, 'GOOGLE_OAUTH', () => handleGoogleAuth());
    return false;
  }
}

// DOM 로드 완료 후 구글 버튼 이벤트 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
  // 구글 로그인 버튼 이벤트
  const googleLoginBtn = document.getElementById('google-login');
  const googleSignupBtn = document.getElementById('google-signup');
  
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', handleGoogleAuth);
  }
  
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener('click', handleGoogleAuth);
  }
  
  console.log('[AUTH] 구글 OAuth 버튼 이벤트 리스너 등록 완료');
});
