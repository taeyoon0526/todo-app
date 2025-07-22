/**
 * ErrorToast - 향상된 토스트 알림 컴포넌트
 * 
 * 기능:
 * - 다양한 타입별 토스트 알림 (success, error, warning, info)
 * - 큐 관리 시스템으로 여러 알림 순차 표시
 * - 네트워크 오류, 오프라인 상태 감지 및 알림
 * - 애니메이션 및 접근성 지원
 * - 자동 해제 및 수동 닫기
 */

class ErrorToast {
  constructor() {
    this.toastQueue = []; // 토스트 큐
    this.activeToasts = new Map(); // 활성 토스트 추적
    this.maxToasts = 3; // 최대 동시 표시 개수
    this.defaultDuration = 5000; // 기본 표시 시간
    this.animationDuration = 300; // 애니메이션 시간
    
    // 토스트 타입별 설정
    this.toastTypes = {
      'success': {
        icon: '✓',
        className: 'toast-success',
        defaultDuration: 3000
      },
      'error': {
        icon: '✕',
        className: 'toast-error',
        defaultDuration: 6000
      },
      'warning': {
        icon: '⚠',
        className: 'toast-warning',
        defaultDuration: 5000
      },
      'info': {
        icon: 'ℹ',
        className: 'toast-info',
        defaultDuration: 4000
      },
      'offline': {
        icon: '📡',
        className: 'toast-offline',
        defaultDuration: 0 // 무한 표시 (수동 닫기만)
      },
      'network': {
        icon: '🌐',
        className: 'toast-network',
        defaultDuration: 8000
      }
    };
    
    this.init();
  }
  
  /**
   * 토스트 시스템 초기화
   */
  init() {
    console.log('[TOAST] 향상된 토스트 시스템 초기화');
    
    // CSS 스타일 주입
    this.injectStyles();
    
    // 토스트 컨테이너 생성
    this.createContainer();
    
    // 네트워크 상태 모니터링
    this.setupNetworkMonitoring();
    
    // 전역 접근을 위한 window 등록
    if (typeof window !== 'undefined') {
      window.ErrorToast = this;
      window.ToastManager = this; // 기존 ToastManager와 호환성
    }
  }
  
  /**
   * CSS 스타일 주입
   */
  injectStyles() {
    const styleId = 'error-toast-styles';
    
    if (document.getElementById(styleId)) {
      return; // 이미 주입됨
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 토스트 컨테이너 */
      .error-toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      }
      
      @media (max-width: 768px) {
        .error-toast-container {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
      
      /* 토스트 기본 스타일 */
      .error-toast {
        display: flex;
        align-items: flex-start;
        padding: 16px;
        margin-bottom: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        min-height: 60px;
        max-width: 100%;
        word-wrap: break-word;
        pointer-events: auto;
        transform: translateX(100%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      
      .error-toast.toast-show {
        transform: translateX(0);
        opacity: 1;
      }
      
      .error-toast.toast-hiding {
        transform: translateX(100%);
        opacity: 0;
      }
      
      /* 토스트 타입별 스타일 */
      .toast-success {
        background: linear-gradient(135deg, #4CAF50, #66BB6A);
        color: white;
      }
      
      .toast-error {
        background: linear-gradient(135deg, #f44336, #ef5350);
        color: white;
      }
      
      .toast-warning {
        background: linear-gradient(135deg, #ff9800, #ffb74d);
        color: white;
      }
      
      .toast-info {
        background: linear-gradient(135deg, #2196F3, #42A5F5);
        color: white;
      }
      
      .toast-offline {
        background: linear-gradient(135deg, #9e9e9e, #bdbdbd);
        color: white;
        border: 2px dashed #757575;
      }
      
      .toast-network {
        background: linear-gradient(135deg, #e91e63, #f06292);
        color: white;
      }
      
      /* 토스트 아이콘 */
      .toast-icon {
        font-size: 20px;
        margin-right: 12px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      /* 토스트 콘텐츠 */
      .toast-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .toast-title {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
        line-height: 1.2;
      }
      
      .toast-message {
        font-size: 14px;
        line-height: 1.4;
        opacity: 0.95;
      }
      
      /* 닫기 버튼 */
      .toast-close {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 12px;
        opacity: 0.7;
        transition: opacity 0.2s;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
      }
      
      .toast-close:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
      }
      
      /* 진행 표시줄 */
      .toast-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 0 0 8px 8px;
        transition: width linear;
      }
      
      /* 액션 버튼 */
      .toast-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }
      
      .toast-action {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: inherit;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.2s;
      }
      
      .toast-action:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      /* 다크 모드 지원 */
      @media (prefers-color-scheme: dark) {
        .error-toast {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
      }
      
      /* 접근성 개선 */
      .error-toast[role="alert"] {
        /* 스크린 리더 지원 */
      }
      
      @media (prefers-reduced-motion: reduce) {
        .error-toast {
          transition: opacity 0.2s !important;
          transform: none !important;
        }
        
        .error-toast.toast-show {
          opacity: 1;
        }
        
        .error-toast.toast-hiding {
          opacity: 0;
        }
      }
      
      /* 모바일 최적화 */
      @media (max-width: 480px) {
        .error-toast {
          padding: 12px;
          margin-bottom: 8px;
        }
        
        .toast-icon {
          font-size: 18px;
          margin-right: 10px;
        }
        
        .toast-title {
          font-size: 14px;
        }
        
        .toast-message {
          font-size: 13px;
        }
      }
      
      /* 고대비 모드 지원 */
      @media (prefers-contrast: high) {
        .error-toast {
          border: 2px solid currentColor;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('[TOAST] 토스트 스타일 주입 완료');
  }
  
  /**
   * 토스트 컨테이너 생성
   */
  createContainer() {
    const existingContainer = document.getElementById('error-toast-container');
    if (existingContainer) {
      this.container = existingContainer;
      return;
    }
    
    this.container = document.createElement('div');
    this.container.id = 'error-toast-container';
    this.container.className = 'error-toast-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-atomic', 'false');
    
    document.body.appendChild(this.container);
    console.log('[TOAST] 토스트 컨테이너 생성 완료');
  }
  
  /**
   * 네트워크 상태 모니터링 설정
   */
  setupNetworkMonitoring() {
    // 온라인/오프라인 상태 변경 감지
    window.addEventListener('online', () => {
      this.show('인터넷 연결이 복구되었습니다.', 'success', {
        title: '연결 복구',
        duration: 3000
      });
    });
    
    window.addEventListener('offline', () => {
      this.show('인터넷 연결이 끊어졌습니다. 일부 기능이 제한될 수 있습니다.', 'offline', {
        title: '오프라인 모드',
        persistent: true,
        actions: [
          {
            text: '새로고침',
            action: () => window.location.reload()
          }
        ]
      });
    });
    
    // 초기 오프라인 상태 확인
    if (!navigator.onLine) {
      setTimeout(() => {
        this.show('현재 오프라인 상태입니다.', 'offline', {
          title: '오프라인 모드',
          persistent: true
        });
      }, 1000);
    }
  }
  
  /**
   * 토스트 표시
   * @param {string} message - 메시지 내용
   * @param {string} type - 토스트 타입 (success, error, warning, info, offline, network)
   * @param {Object} options - 추가 옵션
   */
  show(message, type = 'info', options = {}) {
    const toastConfig = this.toastTypes[type] || this.toastTypes.info;
    
    const toastData = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      type,
      title: options.title || this.getDefaultTitle(type),
      duration: options.duration !== undefined ? options.duration : toastConfig.defaultDuration,
      persistent: options.persistent || false,
      actions: options.actions || [],
      ...toastConfig
    };
    
    // 큐에 추가
    this.toastQueue.push(toastData);
    
    // 큐 처리
    this.processQueue();
    
    console.log(`[TOAST] 토스트 표시: ${type} - ${message} (ID: ${toastData.id})`);
    
    return toastData.id;
  }
  
  /**
   * 토스트 큐 처리
   */
  processQueue() {
    // 현재 표시 중인 토스트가 최대치를 넘지 않으면 새 토스트 표시
    while (this.toastQueue.length > 0 && this.activeToasts.size < this.maxToasts) {
      const toastData = this.toastQueue.shift();
      this.displayToast(toastData);
    }
  }
  
  /**
   * 실제 토스트 DOM 생성 및 표시
   */
  displayToast(toastData) {
    const toastElement = document.createElement('div');
    toastElement.id = toastData.id;
    toastElement.className = `error-toast ${toastData.className}`;
    toastElement.setAttribute('role', 'alert');
    toastElement.setAttribute('aria-live', 'assertive');
    
    let progressBar = '';
    if (toastData.duration > 0) {
      progressBar = `<div class="toast-progress" style="width: 100%"></div>`;
    }
    
    let actions = '';
    if (toastData.actions.length > 0) {
      const actionButtons = toastData.actions.map(action => 
        `<button class="toast-action" data-action="${action.text}">${action.text}</button>`
      ).join('');
      actions = `<div class="toast-actions">${actionButtons}</div>`;
    }
    
    toastElement.innerHTML = `
      <div class="toast-icon">${toastData.icon}</div>
      <div class="toast-content">
        <div class="toast-title">${toastData.title}</div>
        <div class="toast-message">${toastData.message}</div>
        ${actions}
      </div>
      <button class="toast-close" aria-label="닫기">×</button>
      ${progressBar}
    `;
    
    // 이벤트 리스너 추가
    this.attachEventListeners(toastElement, toastData);
    
    // DOM에 추가
    this.container.appendChild(toastElement);
    
    // 활성 토스트 맵에 추가
    this.activeToasts.set(toastData.id, {
      element: toastElement,
      data: toastData,
      timeoutId: null
    });
    
    // 애니메이션 시작
    setTimeout(() => {
      toastElement.classList.add('toast-show');
    }, 10);
    
    // 자동 해제 설정
    if (toastData.duration > 0 && !toastData.persistent) {
      this.setAutoHide(toastData.id, toastData.duration);
    }
  }
  
  /**
   * 이벤트 리스너 연결
   */
  attachEventListeners(toastElement, toastData) {
    // 닫기 버튼
    const closeButton = toastElement.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
      this.hide(toastData.id);
    });
    
    // 액션 버튼들
    const actionButtons = toastElement.querySelectorAll('.toast-action');
    actionButtons.forEach((button, index) => {
      if (toastData.actions[index] && toastData.actions[index].action) {
        button.addEventListener('click', () => {
          toastData.actions[index].action();
          this.hide(toastData.id); // 액션 실행 후 토스트 닫기
        });
      }
    });
    
    // 호버 시 자동 해제 일시정지
    toastElement.addEventListener('mouseenter', () => {
      this.pauseAutoHide(toastData.id);
    });
    
    toastElement.addEventListener('mouseleave', () => {
      this.resumeAutoHide(toastData.id);
    });
  }
  
  /**
   * 자동 해제 설정
   */
  setAutoHide(toastId, duration) {
    const toastInfo = this.activeToasts.get(toastId);
    if (!toastInfo) return;
    
    const progressBar = toastInfo.element.querySelector('.toast-progress');
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = '0%';
    }
    
    toastInfo.timeoutId = setTimeout(() => {
      this.hide(toastId);
    }, duration);
  }
  
  /**
   * 자동 해제 일시정지
   */
  pauseAutoHide(toastId) {
    const toastInfo = this.activeToasts.get(toastId);
    if (!toastInfo || !toastInfo.timeoutId) return;
    
    clearTimeout(toastInfo.timeoutId);
    toastInfo.timeoutId = null;
    
    const progressBar = toastInfo.element.querySelector('.toast-progress');
    if (progressBar) {
      progressBar.style.transition = 'none';
    }
  }
  
  /**
   * 자동 해제 재개
   */
  resumeAutoHide(toastId) {
    const toastInfo = this.activeToasts.get(toastId);
    if (!toastInfo || toastInfo.timeoutId || toastInfo.data.persistent) return;
    
    const progressBar = toastInfo.element.querySelector('.toast-progress');
    if (progressBar) {
      const currentWidth = parseFloat(progressBar.style.width) || 0;
      const remainingTime = (currentWidth / 100) * toastInfo.data.duration;
      
      if (remainingTime > 0) {
        progressBar.style.transition = `width ${remainingTime}ms linear`;
        progressBar.style.width = '0%';
        
        toastInfo.timeoutId = setTimeout(() => {
          this.hide(toastId);
        }, remainingTime);
      } else {
        this.hide(toastId);
      }
    }
  }
  
  /**
   * 토스트 숨기기
   */
  hide(toastId) {
    const toastInfo = this.activeToasts.get(toastId);
    if (!toastInfo) return;
    
    // 타이머 정리
    if (toastInfo.timeoutId) {
      clearTimeout(toastInfo.timeoutId);
    }
    
    // 숨김 애니메이션
    toastInfo.element.classList.add('toast-hiding');
    
    setTimeout(() => {
      // DOM에서 제거
      if (toastInfo.element.parentNode) {
        toastInfo.element.parentNode.removeChild(toastInfo.element);
      }
      
      // 활성 토스트에서 제거
      this.activeToasts.delete(toastId);
      
      // 큐 처리 계속
      this.processQueue();
      
      console.log(`[TOAST] 토스트 숨김: ${toastId}`);
    }, this.animationDuration);
  }
  
  /**
   * 모든 토스트 숨기기
   */
  hideAll() {
    const toastIds = Array.from(this.activeToasts.keys());
    toastIds.forEach(id => this.hide(id));
    
    // 큐도 비우기
    this.toastQueue = [];
    
    console.log(`[TOAST] 모든 토스트 숨김 (${toastIds.length}개)`);
  }
  
  /**
   * 특정 타입의 토스트만 숨기기
   */
  hideByType(type) {
    const toastIds = Array.from(this.activeToasts.entries())
      .filter(([_, info]) => info.data.type === type)
      .map(([id, _]) => id);
    
    toastIds.forEach(id => this.hide(id));
    
    console.log(`[TOAST] ${type} 타입 토스트 숨김 (${toastIds.length}개)`);
  }
  
  /**
   * 기본 제목 반환
   */
  getDefaultTitle(type) {
    const titles = {
      'success': '성공',
      'error': '오류',
      'warning': '경고',
      'info': '알림',
      'offline': '연결 상태',
      'network': '네트워크 오류'
    };
    
    return titles[type] || '알림';
  }
  
  /**
   * 편의 메서드들
   */
  
  // 성공 메시지
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }
  
  // 에러 메시지
  error(message, options = {}) {
    return this.show(message, 'error', options);
  }
  
  // 경고 메시지
  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }
  
  // 정보 메시지
  info(message, options = {}) {
    return this.show(message, 'info', options);
  }
  
  // 네트워크 에러 메시지
  networkError(message, options = {}) {
    return this.show(message, 'network', {
      title: '네트워크 오류',
      actions: [
        {
          text: '다시 시도',
          action: () => window.location.reload()
        }
      ],
      ...options
    });
  }
  
  // 오프라인 메시지
  offline(message, options = {}) {
    return this.show(message, 'offline', {
      persistent: true,
      ...options
    });
  }
}

// 전역 인스턴스 생성
const errorToast = new ErrorToast();

// ES6 모듈 export
export { ErrorToast, errorToast };

// 전역 스코프에서도 사용 가능하도록
if (typeof window !== 'undefined') {
  window.errorToast = errorToast;
  // 기존 ToastManager와의 호환성을 위해
  if (!window.ToastManager) {
    window.ToastManager = errorToast;
  }
}

console.log('[TOAST] 향상된 에러 토스트 시스템 준비 완료');
