/**
 * TODO-LIST Application - Analytics & Performance Monitoring
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

class Analytics {
  constructor() {
    this.sessionStart = Date.now();
    this.events = [];
    this.userAgent = navigator.userAgent;
    this.screenResolution = `${screen.width}x${screen.height}`;
    this.isOnline = navigator.onLine;
    
    this.init();
  }

  init() {
    // Track page load performance
    this.trackPageLoad();
    
    // Track online/offline status
    this.trackConnectivity();
    
    // Track user interactions
    this.trackUserInteractions();
    
    // Track errors
    this.trackErrors();
    
    // Send analytics data periodically
    setInterval(() => this.sendAnalytics(), 30000); // Every 30 seconds
  }

  trackPageLoad() {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      if (perfData) {
        this.logEvent('page_load', {
          loadTime: perfData.loadEventEnd - perfData.loadEventStart,
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          firstPaint: this.getFirstPaint(),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  getFirstPaint() {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }

  trackConnectivity() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.logEvent('connectivity_change', {
        status: 'online',
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.logEvent('connectivity_change', {
        status: 'offline',
        timestamp: new Date().toISOString()
      });
    });
  }

  trackUserInteractions() {
    // Track TODO operations
    document.addEventListener('todo-created', (event) => {
      this.logEvent('todo_created', {
        timestamp: new Date().toISOString(),
        offline: !this.isOnline
      });
    });

    document.addEventListener('todo-completed', (event) => {
      this.logEvent('todo_completed', {
        timestamp: new Date().toISOString(),
        offline: !this.isOnline
      });
    });

    document.addEventListener('todo-deleted', (event) => {
      this.logEvent('todo_deleted', {
        timestamp: new Date().toISOString(),
        offline: !this.isOnline
      });
    });

    // Track login/logout
    document.addEventListener('user-login', (event) => {
      this.logEvent('user_login', {
        timestamp: new Date().toISOString(),
        method: event.detail?.method || 'unknown'
      });
    });

    document.addEventListener('user-logout', (event) => {
      this.logEvent('user_logout', {
        timestamp: new Date().toISOString(),
        sessionDuration: Date.now() - this.sessionStart
      });
    });
  }

  trackErrors() {
    window.addEventListener('error', (event) => {
      this.logEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.logEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        timestamp: new Date().toISOString()
      });
    });
  }

  logEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      data: {
        ...data,
        userAgent: this.userAgent,
        screenResolution: this.screenResolution,
        isOnline: this.isOnline,
        url: window.location.href,
        referrer: document.referrer
      },
      timestamp: new Date().toISOString()
    };

    this.events.push(event);
    
    // Keep only last 100 events to prevent memory issues
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    console.log('Analytics Event:', event);
  }

  async sendAnalytics() {
    if (this.events.length === 0) return;

    const analyticsData = {
      sessionId: this.getSessionId(),
      events: [...this.events],
      meta: {
        userAgent: this.userAgent,
        screenResolution: this.screenResolution,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        timestamp: new Date().toISOString()
      }
    };

    try {
      // In a real application, you would send this to your analytics server
      // For now, we'll just store it locally and log it
      this.storeAnalyticsLocally(analyticsData);
      
      // Clear sent events
      this.events = [];
      
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  storeAnalyticsLocally(data) {
    try {
      const stored = JSON.parse(localStorage.getItem('todo-analytics') || '[]');
      stored.push(data);
      
      // Keep only last 50 analytics batches
      const limited = stored.slice(-50);
      localStorage.setItem('todo-analytics', JSON.stringify(limited));
      
    } catch (error) {
      console.error('Failed to store analytics locally:', error);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('analytics-session-id');
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics-session-id', sessionId);
    }
    return sessionId;
  }

  // Public methods for manual event tracking
  trackCustomEvent(eventName, data = {}) {
    this.logEvent(eventName, data);
  }

  trackPerformance(name, startTime, endTime) {
    this.logEvent('performance_measure', {
      name,
      duration: endTime - startTime,
      timestamp: new Date().toISOString()
    });
  }

  // Get analytics summary for debugging
  getAnalyticsSummary() {
    const stored = JSON.parse(localStorage.getItem('todo-analytics') || '[]');
    const totalEvents = stored.reduce((sum, batch) => sum + batch.events.length, 0);
    
    return {
      currentSession: {
        sessionId: this.getSessionId(),
        pendingEvents: this.events.length,
        sessionDuration: Date.now() - this.sessionStart
      },
      historical: {
        totalBatches: stored.length,
        totalEvents: totalEvents,
        lastBatch: stored[stored.length - 1]?.meta.timestamp
      }
    };
  }
}

// Initialize analytics when the script loads
const analytics = new Analytics();

// Export for global access
window.TodoAnalytics = analytics;
