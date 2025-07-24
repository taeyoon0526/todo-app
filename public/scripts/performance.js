/**
 * TODO-LIST Application - Performance Optimizations
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/performance.js

// 디바운스 유틸리티
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 스로틀 유틸리티
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 가상 스크롤링 (대량의 TODO 항목용)
export class VirtualScroller {
  constructor(container, itemHeight, renderItem) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.renderItem = renderItem;
    this.scrollTop = 0;
    this.items = [];
    this.visibleItems = new Map();
    
    this.setupScroll();
  }
  
  setupScroll() {
    this.container.addEventListener('scroll', throttle(() => {
      this.updateVisibleItems();
    }, 16)); // 60fps
  }
  
  setItems(items) {
    this.items = items;
    this.container.style.height = `${items.length * this.itemHeight}px`;
    this.updateVisibleItems();
  }
  
  updateVisibleItems() {
    const containerHeight = this.container.clientHeight;
    const scrollTop = this.container.scrollTop;
    
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / this.itemHeight) + 1,
      this.items.length
    );
    
    // 현재 보이는 항목들 렌더링
    for (let i = startIndex; i < endIndex; i++) {
      if (!this.visibleItems.has(i)) {
        const element = this.renderItem(this.items[i], i);
        element.style.position = 'absolute';
        element.style.top = `${i * this.itemHeight}px`;
        element.style.width = '100%';
        this.container.appendChild(element);
        this.visibleItems.set(i, element);
      }
    }
    
    // 보이지 않는 항목들 제거
    for (const [index, element] of this.visibleItems) {
      if (index < startIndex || index >= endIndex) {
        element.remove();
        this.visibleItems.delete(index);
      }
    }
  }
}

// 이미지 지연 로딩
export function setupLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    images.forEach(img => imageObserver.observe(img));
  } else {
    // 폴백: 즉시 로드
    images.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}

// 메모리 사용량 모니터링
export function monitorMemoryUsage() {
  if ('memory' in performance) {
    const memory = performance.memory;
    console.log('[PERFORMANCE] Memory usage:', {
      used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
    });
  }
}

// FPS 모니터링
export class FPSMonitor {
  constructor() {
    this.fps = 0;
    this.lastTime = performance.now();
    this.frames = 0;
    this.monitoring = false;
  }
  
  start() {
    this.monitoring = true;
    this.measure();
  }
  
  stop() {
    this.monitoring = false;
  }
  
  measure() {
    if (!this.monitoring) return;
    
    const now = performance.now();
    this.frames++;
    
    if (now >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.frames = 0;
      this.lastTime = now;
      
      console.log(`[PERFORMANCE] FPS: ${this.fps}`);
      
      if (this.fps < 30) {
        console.warn('[PERFORMANCE] Low FPS detected!');
      }
    }
    
    requestAnimationFrame(() => this.measure());
  }
}

// 네트워크 상태 모니터링
export function setupNetworkMonitoring() {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    
    function logNetworkInfo() {
      console.log('[NETWORK] Connection info:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      });
    }
    
    logNetworkInfo();
    connection.addEventListener('change', logNetworkInfo);
  }
}

// 성능 메트릭 수집
export function collectPerformanceMetrics() {
  // Navigation Timing API
  if ('performance' in window && 'navigation' in performance) {
    const navigation = performance.getEntriesByType('navigation')[0];
    
    console.log('[PERFORMANCE] Navigation metrics:', {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
      loadComplete: navigation.loadEventEnd - navigation.navigationStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 'N/A',
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 'N/A'
    });
  }
  
  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[PERFORMANCE] LCP:', entry.startTime);
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          console.log('[PERFORMANCE] CLS:', entry.value);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// 리소스 미리 로드
export function preloadCriticalResources() {
  const criticalResources = [
    'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
  ];
  
  criticalResources.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = url;
    document.head.appendChild(link);
  });
}

// 접근성 개선
export function enhanceAccessibility() {
  // 포커스 트랩 설정
  const modals = document.querySelectorAll('.modal, .mobile-add-modal');
  modals.forEach(modal => {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
        
        if (e.key === 'Escape') {
          const closeBtn = modal.querySelector('[data-close], .close, #mobile-cancel-btn');
          if (closeBtn) closeBtn.click();
        }
      });
    }
  });
  
  // 스크린 리더를 위한 라이브 리전 설정
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'sr-only';
  document.body.appendChild(liveRegion);
  
  // TODO 상태 변경 시 알림
  window.addEventListener('todo-status-changed', (e) => {
    const { todo, status } = e.detail;
    liveRegion.textContent = `${todo.title} 작업이 ${status === 'completed' ? '완료' : '미완료'}로 변경되었습니다.`;
  });
}

// 성능 최적화 초기화
export function initializePerformanceOptimizations() {
  console.log('[PERFORMANCE] 성능 최적화 초기화');
  
  // 중요 리소스 미리 로드
  preloadCriticalResources();
  
  // 지연 로딩 설정
  setupLazyLoading();
  
  // 네트워크 모니터링
  setupNetworkMonitoring();
  
  // 성능 메트릭 수집
  collectPerformanceMetrics();
  
  // 접근성 개선
  enhanceAccessibility();
  
  // 메모리 사용량 정기 체크 (개발 환경에서만)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    setInterval(monitorMemoryUsage, 30000); // 30초마다
  }
}
