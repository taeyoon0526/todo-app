/**
 * LoadingSkeleton - 스켈레톤 로딩 UI 컴포넌트
 * 
 * 기능:
 * - API 호출 및 데이터 로딩 시 일관된 스켈레톤 UI 제공
 * - 다양한 레이아웃과 크기 지원
 * - 부드러운 애니메이션 효과
 * - 접근성 고려 (aria-label, role)
 */

class LoadingSkeleton {
  constructor() {
    this.activeSkeletons = new Map(); // 활성 스켈레톤 추적
    this.animationId = null;
    
    // 스켈레톤 타입별 설정
    this.skeletonTypes = {
      'todo-item': {
        template: this.getTodoItemSkeleton(),
        className: 'skeleton-todo-item'
      },
      'todo-list': {
        template: this.getTodoListSkeleton(),
        className: 'skeleton-todo-list'
      },
      'card': {
        template: this.getCardSkeleton(),
        className: 'skeleton-card'
      },
      'text': {
        template: this.getTextSkeleton(),
        className: 'skeleton-text'
      },
      'button': {
        template: this.getButtonSkeleton(),
        className: 'skeleton-button'
      },
      'form': {
        template: this.getFormSkeleton(),
        className: 'skeleton-form'
      }
    };
    
    this.init();
  }
  
  /**
   * 스켈레톤 시스템 초기화
   */
  init() {
    console.log('[SKELETON] 스켈레톤 로딩 시스템 초기화');
    
    // CSS 스타일 주입
    this.injectStyles();
    
    // 전역 접근을 위한 window 등록
    if (typeof window !== 'undefined') {
      window.LoadingSkeleton = this;
    }
  }
  
  /**
   * CSS 스타일 주입
   */
  injectStyles() {
    const styleId = 'skeleton-styles';
    
    if (document.getElementById(styleId)) {
      return; // 이미 주입됨
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* 스켈레톤 기본 스타일 */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
        position: relative;
        overflow: hidden;
      }
      
      .skeleton::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
        animation: skeleton-shimmer 2s infinite;
      }
      
      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      @keyframes skeleton-shimmer {
        0% { left: -100%; }
        100% { left: 100%; }
      }
      
      /* 스켈레톤 컨테이너 */
      .skeleton-container {
        opacity: 1;
        transition: opacity 0.3s ease-in-out;
      }
      
      .skeleton-container.skeleton-hiding {
        opacity: 0;
      }
      
      /* TODO 아이템 스켈레톤 */
      .skeleton-todo-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .skeleton-todo-checkbox {
        width: 20px;
        height: 20px;
        margin-right: 12px;
        border-radius: 50%;
      }
      
      .skeleton-todo-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .skeleton-todo-title {
        height: 16px;
        width: 70%;
      }
      
      .skeleton-todo-meta {
        height: 12px;
        width: 40%;
      }
      
      .skeleton-todo-actions {
        display: flex;
        gap: 8px;
      }
      
      .skeleton-todo-action {
        width: 24px;
        height: 24px;
        border-radius: 4px;
      }
      
      /* TODO 리스트 스켈레톤 */
      .skeleton-todo-list {
        padding: 16px;
      }
      
      .skeleton-todo-list .skeleton-todo-item:last-child {
        margin-bottom: 0;
      }
      
      /* 카드 스켈레톤 */
      .skeleton-card {
        padding: 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .skeleton-card-header {
        height: 20px;
        width: 60%;
        margin-bottom: 12px;
      }
      
      .skeleton-card-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .skeleton-card-line {
        height: 14px;
      }
      
      .skeleton-card-line:nth-child(1) { width: 100%; }
      .skeleton-card-line:nth-child(2) { width: 85%; }
      .skeleton-card-line:nth-child(3) { width: 60%; }
      
      /* 텍스트 스켈레톤 */
      .skeleton-text {
        height: 16px;
        margin: 4px 0;
      }
      
      .skeleton-text.skeleton-text-sm { height: 12px; }
      .skeleton-text.skeleton-text-lg { height: 20px; }
      .skeleton-text.skeleton-text-xl { height: 24px; }
      
      .skeleton-text.skeleton-text-short { width: 30%; }
      .skeleton-text.skeleton-text-medium { width: 60%; }
      .skeleton-text.skeleton-text-long { width: 90%; }
      .skeleton-text.skeleton-text-full { width: 100%; }
      
      /* 버튼 스켈레톤 */
      .skeleton-button {
        height: 36px;
        width: 120px;
        border-radius: 4px;
        display: inline-block;
        margin: 4px;
      }
      
      .skeleton-button.skeleton-button-sm { height: 28px; width: 80px; }
      .skeleton-button.skeleton-button-lg { height: 44px; width: 160px; }
      .skeleton-button.skeleton-button-full { width: 100%; }
      
      /* 폼 스켈레톤 */
      .skeleton-form {
        padding: 16px;
      }
      
      .skeleton-form-field {
        margin-bottom: 16px;
      }
      
      .skeleton-form-label {
        height: 14px;
        width: 25%;
        margin-bottom: 6px;
      }
      
      .skeleton-form-input {
        height: 40px;
        width: 100%;
        border-radius: 4px;
      }
      
      /* 다크 모드 지원 */
      @media (prefers-color-scheme: dark) {
        .skeleton {
          background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
        }
        
        .skeleton::after {
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        }
        
        .skeleton-todo-item,
        .skeleton-card {
          background: #1e1e1e;
        }
      }
      
      /* 모바일 최적화 */
      @media (max-width: 768px) {
        .skeleton-todo-item {
          padding: 10px;
          margin-bottom: 6px;
        }
        
        .skeleton-todo-content {
          gap: 4px;
        }
        
        .skeleton-card {
          padding: 12px;
        }
        
        .skeleton-form {
          padding: 12px;
        }
      }
      
      /* 접근성 개선 */
      .skeleton-container[aria-busy="true"] {
        pointer-events: none;
      }
      
      @media (prefers-reduced-motion: reduce) {
        .skeleton,
        .skeleton::after {
          animation: none !important;
        }
        
        .skeleton {
          background: #f0f0f0;
        }
        
        @media (prefers-color-scheme: dark) {
          .skeleton {
            background: #2a2a2a;
          }
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log('[SKELETON] 스켈레톤 스타일 주입 완료');
  }
  
  /**
   * TODO 아이템 스켈레톤 템플릿
   */
  getTodoItemSkeleton() {
    return `
      <div class="skeleton-todo-item">
        <div class="skeleton skeleton-todo-checkbox"></div>
        <div class="skeleton-todo-content">
          <div class="skeleton skeleton-todo-title"></div>
          <div class="skeleton skeleton-todo-meta"></div>
        </div>
        <div class="skeleton-todo-actions">
          <div class="skeleton skeleton-todo-action"></div>
          <div class="skeleton skeleton-todo-action"></div>
        </div>
      </div>
    `;
  }
  
  /**
   * TODO 리스트 스켈레톤 템플릿
   */
  getTodoListSkeleton(count = 5) {
    const items = Array(count).fill(this.getTodoItemSkeleton()).join('');
    return `
      <div class="skeleton-todo-list">
        ${items}
      </div>
    `;
  }
  
  /**
   * 카드 스켈레톤 템플릿
   */
  getCardSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton skeleton-card-header"></div>
        <div class="skeleton-card-content">
          <div class="skeleton skeleton-card-line"></div>
          <div class="skeleton skeleton-card-line"></div>
          <div class="skeleton skeleton-card-line"></div>
        </div>
      </div>
    `;
  }
  
  /**
   * 텍스트 스켈레톤 템플릿
   */
  getTextSkeleton(size = 'medium', width = 'medium') {
    return `<div class="skeleton skeleton-text skeleton-text-${size} skeleton-text-${width}"></div>`;
  }
  
  /**
   * 버튼 스켈레톤 템플릿
   */
  getButtonSkeleton(size = 'normal') {
    return `<div class="skeleton skeleton-button skeleton-button-${size}"></div>`;
  }
  
  /**
   * 폼 스켈레톤 템플릿
   */
  getFormSkeleton(fields = 3) {
    const fieldElements = Array(fields).fill(0).map(() => `
      <div class="skeleton-form-field">
        <div class="skeleton skeleton-form-label"></div>
        <div class="skeleton skeleton-form-input"></div>
      </div>
    `).join('');
    
    return `
      <div class="skeleton-form">
        ${fieldElements}
        <div class="skeleton skeleton-button skeleton-button-full"></div>
      </div>
    `;
  }
  
  /**
   * 스켈레톤 표시
   * @param {string|HTMLElement} target - 대상 요소 (선택자 또는 DOM 요소)
   * @param {string} type - 스켈레톤 타입
   * @param {Object} options - 추가 옵션
   */
  show(target, type = 'todo-list', options = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    
    if (!element) {
      console.warn('[SKELETON] 대상 요소를 찾을 수 없습니다:', target);
      return null;
    }
    
    const skeletonConfig = this.skeletonTypes[type];
    if (!skeletonConfig) {
      console.warn('[SKELETON] 알 수 없는 스켈레톤 타입:', type);
      return null;
    }
    
    // 기존 콘텐츠 백업
    const originalContent = element.innerHTML;
    const originalClasses = element.className;
    
    // 스켈레톤 컨테이너 생성
    const skeletonId = `skeleton-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const skeletonContainer = document.createElement('div');
    skeletonContainer.id = skeletonId;
    skeletonContainer.className = `skeleton-container ${skeletonConfig.className}`;
    skeletonContainer.setAttribute('aria-busy', 'true');
    skeletonContainer.setAttribute('aria-label', options.label || '콘텐츠 로딩 중...');
    skeletonContainer.setAttribute('role', 'status');
    
    // 커스텀 템플릿이 있는 경우 사용
    const template = options.template || skeletonConfig.template;
    
    // count 옵션 처리 (리스트 타입)
    if (type === 'todo-list' && options.count) {
      skeletonContainer.innerHTML = this.getTodoListSkeleton(options.count);
    } else if (type === 'form' && options.fields) {
      skeletonContainer.innerHTML = this.getFormSkeleton(options.fields);
    } else {
      skeletonContainer.innerHTML = template;
    }
    
    // 원본 요소에 스켈레톤 삽입
    element.innerHTML = '';
    element.appendChild(skeletonContainer);
    
    // 스켈레톤 정보 저장
    const skeletonInfo = {
      id: skeletonId,
      element,
      container: skeletonContainer,
      originalContent,
      originalClasses,
      type,
      startTime: Date.now(),
      options
    };
    
    this.activeSkeletons.set(skeletonId, skeletonInfo);
    
    console.log(`[SKELETON] 스켈레톤 표시: ${type} (ID: ${skeletonId})`);
    
    return skeletonId;
  }
  
  /**
   * 스켈레톤 숨기기
   * @param {string} skeletonId - 스켈레톤 ID
   * @param {boolean} immediate - 즉시 숨김 여부
   */
  hide(skeletonId, immediate = false) {
    const skeletonInfo = this.activeSkeletons.get(skeletonId);
    
    if (!skeletonInfo) {
      console.warn('[SKELETON] 스켈레톤을 찾을 수 없습니다:', skeletonId);
      return false;
    }
    
    const { element, container, originalContent, originalClasses } = skeletonInfo;
    
    if (immediate) {
      // 즉시 복원
      this.restoreOriginalContent(skeletonInfo);
    } else {
      // 페이드 아웃 후 복원
      container.classList.add('skeleton-hiding');
      
      setTimeout(() => {
        this.restoreOriginalContent(skeletonInfo);
      }, 300);
    }
    
    const duration = Date.now() - skeletonInfo.startTime;
    console.log(`[SKELETON] 스켈레톤 숨김: ${skeletonInfo.type} (${duration}ms, ID: ${skeletonId})`);
    
    return true;
  }
  
  /**
   * 원본 콘텐츠 복원
   */
  restoreOriginalContent(skeletonInfo) {
    const { element, originalContent, originalClasses } = skeletonInfo;
    
    // 원본 콘텐츠 복원
    element.innerHTML = originalContent;
    element.className = originalClasses;
    
    // 접근성 속성 제거
    element.removeAttribute('aria-busy');
    
    // 활성 스켈레톤 목록에서 제거
    this.activeSkeletons.delete(skeletonInfo.id);
  }
  
  /**
   * 모든 스켈레톤 숨기기
   */
  hideAll(immediate = false) {
    const skeletonIds = Array.from(this.activeSkeletons.keys());
    
    skeletonIds.forEach(id => {
      this.hide(id, immediate);
    });
    
    console.log(`[SKELETON] 모든 스켈레톤 숨김 (${skeletonIds.length}개)`);
  }
  
  /**
   * 특정 타입의 스켈레톤 숨기기
   */
  hideByType(type, immediate = false) {
    const skeletonIds = Array.from(this.activeSkeletons.entries())
      .filter(([_, info]) => info.type === type)
      .map(([id, _]) => id);
    
    skeletonIds.forEach(id => {
      this.hide(id, immediate);
    });
    
    console.log(`[SKELETON] ${type} 타입 스켈레톤 숨김 (${skeletonIds.length}개)`);
  }
  
  /**
   * 활성 스켈레톤 정보 반환
   */
  getActiveSkeletons() {
    return Array.from(this.activeSkeletons.entries()).map(([id, info]) => ({
      id,
      type: info.type,
      duration: Date.now() - info.startTime,
      element: info.element
    }));
  }
  
  /**
   * 편의 메서드들
   */
  
  // TODO 리스트 스켈레톤
  showTodoList(target, count = 5, options = {}) {
    return this.show(target, 'todo-list', { count, ...options });
  }
  
  // TODO 아이템 스켈레톤
  showTodoItem(target, options = {}) {
    return this.show(target, 'todo-item', options);
  }
  
  // 카드 스켈레톤
  showCard(target, options = {}) {
    return this.show(target, 'card', options);
  }
  
  // 폼 스켈레톤
  showForm(target, fields = 3, options = {}) {
    return this.show(target, 'form', { fields, ...options });
  }
  
  // 텍스트 스켈레톤
  showText(target, size = 'medium', width = 'medium', options = {}) {
    return this.show(target, 'text', { 
      template: this.getTextSkeleton(size, width), 
      ...options 
    });
  }
  
  // 버튼 스켈레톤
  showButton(target, size = 'normal', options = {}) {
    return this.show(target, 'button', { 
      template: this.getButtonSkeleton(size), 
      ...options 
    });
  }
}

// 전역 인스턴스 생성
const skeletonLoader = new LoadingSkeleton();

// ES6 모듈 export
export { LoadingSkeleton, skeletonLoader };

// 전역 스코프에서도 사용 가능하도록
if (typeof window !== 'undefined') {
  window.skeletonLoader = skeletonLoader;
}

console.log('[SKELETON] 로딩 스켈레톤 시스템 준비 완료');
