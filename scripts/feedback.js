/**
 * TODO-LIST Application - Error Tracking & User Feedback
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
    this.init();
  }

  init() {
    this.setupGlobalErrorHandlers();
    this.setupConsoleInterception();
    this.setupNetworkErrorTracking();
  }

  setupGlobalErrorHandlers() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled_promise',
        message: event.reason?.message || event.reason?.toString() || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.logError({
          type: 'resource',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          timestamp: new Date().toISOString(),
          url: window.location.href
        });
      }
    }, true);
  }

  setupConsoleInterception() {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.logError({
        type: 'console_error',
        message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '),
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      originalConsoleError.apply(console, args);
    };
  }

  setupNetworkErrorTracking() {
    // Intercept fetch failures
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          this.logError({
            type: 'network',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          });
        }
        return response;
      } catch (error) {
        this.logError({
          type: 'network',
          message: `Network request failed: ${error.message}`,
          url: args[0],
          error: error.toString(),
          timestamp: new Date().toISOString()
        });
        throw error;
      }
    };
  }

  logError(errorData) {
    this.errors.push(errorData);
    
    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Store in localStorage for persistence
    this.saveErrorsToStorage();

    // Log to console for debugging
    console.warn('Error tracked:', errorData);

    // Send to analytics if available
    if (window.TodoAnalytics) {
      window.TodoAnalytics.trackCustomEvent('error_occurred', errorData);
    }
  }

  saveErrorsToStorage() {
    try {
      localStorage.setItem('todo-errors', JSON.stringify(this.errors));
    } catch (e) {
      console.warn('Failed to save errors to localStorage:', e);
    }
  }

  loadErrorsFromStorage() {
    try {
      const stored = localStorage.getItem('todo-errors');
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load errors from localStorage:', e);
    }
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
    localStorage.removeItem('todo-errors');
  }

  getErrorSummary() {
    const errorTypes = {};
    this.errors.forEach(error => {
      errorTypes[error.type] = (errorTypes[error.type] || 0) + 1;
    });

    return {
      totalErrors: this.errors.length,
      errorTypes,
      recentErrors: this.errors.slice(-5),
      oldestError: this.errors[0]?.timestamp,
      newestError: this.errors[this.errors.length - 1]?.timestamp
    };
  }
}

class UserFeedback {
  constructor() {
    this.feedback = [];
    this.init();
  }

  init() {
    this.createFeedbackButton();
    this.setupKeyboardShortcut();
  }

  createFeedbackButton() {
    const button = document.createElement('button');
    button.id = 'feedback-button';
    button.innerHTML = '💬';
    button.title = '피드백 보내기 (Ctrl+F)';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #6c63ff;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
      z-index: 1000;
      transition: all 0.3s ease;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 16px rgba(108, 99, 255, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(108, 99, 255, 0.3)';
    });

    button.addEventListener('click', () => {
      this.showFeedbackModal();
    });

    document.body.appendChild(button);
  }

  setupKeyboardShortcut() {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        this.showFeedbackModal();
      }
    });
  }

  showFeedbackModal() {
    const modal = this.createFeedbackModal();
    document.body.appendChild(modal);
    
    // Focus on textarea
    setTimeout(() => {
      modal.querySelector('#feedback-message').focus();
    }, 100);
  }

  createFeedbackModal() {
    const modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
      animation: fadeIn 0.3s ease;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideUp 0.3s ease;
    `;

    content.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #333;">피드백 보내기</h3>
      <p style="margin: 0 0 16px 0; color: #666;">버그 리포트나 개선 제안을 보내주세요.</p>
      
      <form id="feedback-form">
        <div style="margin-bottom: 16px;">
          <label for="feedback-type" style="display: block; margin-bottom: 8px; font-weight: 500;">피드백 유형:</label>
          <select id="feedback-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="bug">버그 리포트</option>
            <option value="feature">기능 제안</option>
            <option value="improvement">개선 제안</option>
            <option value="other">기타</option>
          </select>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label for="feedback-message" style="display: block; margin-bottom: 8px; font-weight: 500;">메시지:</label>
          <textarea 
            id="feedback-message" 
            rows="6" 
            placeholder="상세한 내용을 입력해주세요..."
            style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; font-family: inherit;"
            required
          ></textarea>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label>
            <input type="checkbox" id="include-debug-info" checked style="margin-right: 8px;">
            디버그 정보 포함 (에러 로그, 브라우저 정보 등)
          </label>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" id="cancel-feedback" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
            취소
          </button>
          <button type="submit" style="padding: 8px 16px; background: #6c63ff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            보내기
          </button>
        </div>
      </form>
    `;

    modal.appendChild(content);

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeFeedbackModal(modal);
      }
    });

    content.querySelector('#cancel-feedback').addEventListener('click', () => {
      this.closeFeedbackModal(modal);
    });

    content.querySelector('#feedback-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitFeedback(modal);
    });

    return modal;
  }

  closeFeedbackModal(modal) {
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }

  async submitFeedback(modal) {
    const form = modal.querySelector('#feedback-form');
    const type = form.querySelector('#feedback-type').value;
    const message = form.querySelector('#feedback-message').value;
    const includeDebugInfo = form.querySelector('#include-debug-info').checked;

    if (!message.trim()) {
      alert('메시지를 입력해주세요.');
      return;
    }

    const feedbackData = {
      type,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    if (includeDebugInfo && window.ErrorTracker) {
      feedbackData.debugInfo = {
        recentErrors: window.ErrorTracker.getErrors().slice(-5),
        errorSummary: window.ErrorTracker.getErrorSummary(),
        localStorage: this.getLocalStorageInfo(),
        performance: this.getPerformanceInfo()
      };
    }

    // Store feedback locally
    this.storeFeedback(feedbackData);

    // In a real application, you would send this to your server
    console.log('Feedback submitted:', feedbackData);

    // Track in analytics
    if (window.TodoAnalytics) {
      window.TodoAnalytics.trackCustomEvent('feedback_submitted', {
        type: feedbackData.type,
        hasDebugInfo: includeDebugInfo
      });
    }

    // Show success message
    this.showFeedbackSuccess(modal);
  }

  storeFeedback(feedbackData) {
    try {
      this.feedback.push(feedbackData);
      localStorage.setItem('todo-feedback', JSON.stringify(this.feedback.slice(-20))); // Keep last 20
    } catch (e) {
      console.warn('Failed to store feedback:', e);
    }
  }

  getLocalStorageInfo() {
    const info = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('todo-')) {
          const value = localStorage.getItem(key);
          info[key] = {
            size: value?.length || 0,
            hasData: !!value
          };
        }
      }
    } catch (e) {
      info.error = 'Failed to access localStorage';
    }
    return info;
  }

  getPerformanceInfo() {
    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        memoryUsage: performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        } : null
      };
    } catch (e) {
      return { error: 'Performance info not available' };
    }
  }

  showFeedbackSuccess(modal) {
    const content = modal.querySelector('div');
    content.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
        <h3 style="margin: 0 0 8px 0; color: #28a745;">피드백이 전송되었습니다!</h3>
        <p style="margin: 0 0 20px 0; color: #666;">소중한 의견 감사합니다.</p>
        <button id="close-success" style="padding: 8px 20px; background: #6c63ff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          닫기
        </button>
      </div>
    `;

    content.querySelector('#close-success').addEventListener('click', () => {
      this.closeFeedbackModal(modal);
    });

    // Auto close after 3 seconds
    setTimeout(() => {
      this.closeFeedbackModal(modal);
    }, 3000);
  }
}

// Initialize error tracking and user feedback
const errorTracker = new ErrorTracker();
const userFeedback = new UserFeedback();

// Export for global access
window.ErrorTracker = errorTracker;
window.UserFeedback = userFeedback;
