/**
 * 모바일 환경 QA 자동화 테스트 도구
 * 
 * 기능:
 * - AuthGuard 시스템 동작 검증
 * - 크로스 브라우저 호환성 테스트
 * - 성능 측정 및 리포트 생성
 */

class MobileQATestRunner {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.startTime = null;
    
    // 테스트 설정
    this.config = {
      timeout: 10000, // 10초 타임아웃
      retryCount: 3,   // 실패 시 재시도 횟수
      reportingEnabled: true
    };
    
    // DOM 요소 참조
    this.elements = {
      authSection: null,
      todoApp: null,
      loadingOverlay: null
    };
    
    this.init();
  }
  
  /**
   * 테스트 러너 초기화
   */
  init() {
    console.log('[QA_TEST] 모바일 QA 테스트 러너 초기화');
    
    // DOM 요소 캐싱
    this.cacheElements();
    
    // 브라우저 정보 수집
    this.collectBrowserInfo();
    
    // 테스트 결과 표시 UI 생성
    this.createReportUI();
  }
  
  /**
   * DOM 요소 캐싱
   */
  cacheElements() {
    this.elements = {
      authSection: document.getElementById('auth-section'),
      todoApp: document.getElementById('todo-app'),
      loadingOverlay: document.getElementById('auth-guard-loading') || 
                     document.getElementById('auth-loading-overlay')
    };
  }
  
  /**
   * 브라우저 정보 수집
   */
  collectBrowserInfo() {
    this.browserInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        devicePixelRatio: window.devicePixelRatio
      }
    };
    
    // 모바일 디바이스 감지
    this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.browserType = this.detectBrowserType();
    
    console.log('[QA_TEST] 브라우저 정보:', this.browserInfo);
    console.log('[QA_TEST] 모바일 디바이스:', this.isMobile);
    console.log('[QA_TEST] 브라우저 타입:', this.browserType);
  }
  
  /**
   * 브라우저 타입 감지
   */
  detectBrowserType() {
    const ua = navigator.userAgent;
    
    if (ua.includes('Chrome') && !ua.includes('Edge')) {
      if (ua.includes('Mobile')) return 'Chrome Mobile';
      return 'Chrome Desktop';
    } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
      if (ua.includes('Mobile')) return 'Safari Mobile';
      return 'Safari Desktop';
    } else if (ua.includes('Samsung')) {
      return 'Samsung Internet';
    } else if (ua.includes('wv') && ua.includes('Chrome')) {
      return 'Android WebView';
    } else if (ua.includes('Firefox')) {
      return 'Firefox';
    } else if (ua.includes('Edge')) {
      return 'Microsoft Edge';
    }
    
    return 'Unknown';
  }
  
  /**
   * 전체 테스트 스위트 실행
   */
  async runAllTests() {
    console.log('[QA_TEST] 전체 테스트 스위트 시작');
    this.startTime = Date.now();
    
    const tests = [
      { name: 'TC-001', fn: this.testInitialLoadingState },
      { name: 'TC-002', fn: this.testUnauthenticatedAccess },
      { name: 'TC-003', fn: this.testAuthenticationFlow },
      { name: 'TC-004', fn: this.testTouchInterface },
      { name: 'TC-005', fn: this.testOrientationChange },
      { name: 'TC-008', fn: this.testInitialLoadingPerformance },
      { name: 'TC-009', fn: this.testMemoryUsage }
    ];
    
    for (const test of tests) {
      await this.runSingleTest(test.name, test.fn.bind(this));
    }
    
    // 테스트 완료 후 결과 보고서 생성
    this.generateReport();
  }
  
  /**
   * 단일 테스트 실행
   */
  async runSingleTest(testName, testFunction) {
    console.log(`[QA_TEST] ${testName} 테스트 시작`);
    
    this.currentTest = {
      name: testName,
      startTime: Date.now(),
      status: 'running'
    };
    
    try {
      const result = await Promise.race([
        testFunction(),
        this.createTimeout(this.config.timeout)
      ]);
      
      this.currentTest.status = 'passed';
      this.currentTest.result = result;
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      
      console.log(`[QA_TEST] ${testName} 테스트 통과 (${this.currentTest.duration}ms)`);
      
    } catch (error) {
      this.currentTest.status = 'failed';
      this.currentTest.error = error.message;
      this.currentTest.endTime = Date.now();
      this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
      
      console.error(`[QA_TEST] ${testName} 테스트 실패:`, error);
    }
    
    this.testResults.push({ ...this.currentTest });
    this.updateReportUI();
  }
  
  /**
   * 타임아웃 프로미스 생성
   */
  createTimeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timeout after ${ms}ms`)), ms);
    });
  }
  
  /**
   * TC-001: 초기 로딩 상태 확인
   */
  async testInitialLoadingState() {
    const results = {
      loadingOverlayExists: false,
      loadingMessageVisible: false,
      spinnerActive: false,
      loadingTime: 0
    };
    
    const startTime = Date.now();
    
    // 로딩 오버레이 존재 확인
    if (this.elements.loadingOverlay) {
      results.loadingOverlayExists = true;
      
      // 로딩 메시지 확인
      const loadingMessage = this.elements.loadingOverlay.querySelector('.loading-message, .auth-loading-content p');
      if (loadingMessage && loadingMessage.textContent.includes('인증 상태를 확인')) {
        results.loadingMessageVisible = true;
      }
      
      // 스피너 활성화 확인
      const spinner = this.elements.loadingOverlay.querySelector('.mdl-spinner');
      if (spinner && spinner.classList.contains('is-active')) {
        results.spinnerActive = true;
      }
    }
    
    // 로딩 완료까지 시간 측정
    await this.waitForLoadingComplete();
    results.loadingTime = Date.now() - startTime;
    
    // 검증
    if (!results.loadingOverlayExists) {
      throw new Error('로딩 오버레이가 존재하지 않습니다');
    }
    
    if (!results.loadingMessageVisible) {
      throw new Error('로딩 메시지가 표시되지 않습니다');
    }
    
    if (results.loadingTime > 5000) {
      throw new Error(`로딩 시간이 너무 길습니다: ${results.loadingTime}ms`);
    }
    
    return results;
  }
  
  /**
   * TC-002: 비로그인 상태 TODO 리스트 차단
   */
  async testUnauthenticatedAccess() {
    const results = {
      todoAppHidden: false,
      authSectionVisible: false,
      todoElementsInaccessible: false
    };
    
    // 인증 체크 완료 대기
    await this.waitForAuthCheckComplete();
    
    // TODO 앱이 숨겨져 있는지 확인
    if (this.elements.todoApp) {
      const isHidden = this.elements.todoApp.classList.contains('todo-app-hidden') ||
                      getComputedStyle(this.elements.todoApp).display === 'none';
      results.todoAppHidden = isHidden;
    }
    
    // 인증 섹션이 표시되는지 확인
    if (this.elements.authSection) {
      const isVisible = getComputedStyle(this.elements.authSection).display !== 'none';
      results.authSectionVisible = isVisible;
    }
    
    // TODO 관련 요소들에 접근 불가능한지 확인
    const todoElements = [
      '#todo-input',
      '#todo-list',
      '.filter-tabs',
      '#add-todo-btn'
    ];
    
    let inaccessibleCount = 0;
    todoElements.forEach(selector => {
      const element = document.querySelector(selector);
      if (!element || getComputedStyle(element).display === 'none') {
        inaccessibleCount++;
      }
    });
    
    results.todoElementsInaccessible = inaccessibleCount === todoElements.length;
    
    // 검증
    if (!results.todoAppHidden) {
      throw new Error('TODO 앱이 숨겨지지 않았습니다');
    }
    
    if (!results.authSectionVisible) {
      throw new Error('인증 섹션이 표시되지 않습니다');
    }
    
    return results;
  }
  
  /**
   * TC-003: 인증 플로우 테스트 (시뮬레이션)
   */
  async testAuthenticationFlow() {
    const results = {
      loginFormExists: false,
      inputFieldsAccessible: false,
      buttonsResponsive: false
    };
    
    // 로그인 폼 존재 확인
    const loginForm = document.getElementById('login-form');
    results.loginFormExists = !!loginForm;
    
    // 입력 필드 접근 가능성 확인
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    results.inputFieldsAccessible = !!(emailInput && passwordInput);
    
    // 버튼 반응성 확인 (이벤트 리스너 존재 확인)
    const loginButton = document.querySelector('#login-form button[type="submit"]');
    const googleButton = document.getElementById('google-login');
    
    if (loginButton && googleButton) {
      results.buttonsResponsive = true;
    }
    
    // 검증
    if (!results.loginFormExists) {
      throw new Error('로그인 폼을 찾을 수 없습니다');
    }
    
    if (!results.inputFieldsAccessible) {
      throw new Error('로그인 입력 필드에 접근할 수 없습니다');
    }
    
    return results;
  }
  
  /**
   * TC-004: 터치 인터페이스 호환성
   */
  async testTouchInterface() {
    if (!this.isMobile) {
      return { skipped: true, reason: '모바일 디바이스가 아닙니다' };
    }
    
    const results = {
      touchEventsSupported: false,
      buttonsClickable: false,
      inputFieldsFocusable: false
    };
    
    // 터치 이벤트 지원 확인
    results.touchEventsSupported = 'ontouchstart' in window;
    
    // 버튼 클릭 가능성 확인
    const buttons = document.querySelectorAll('button');
    results.buttonsClickable = buttons.length > 0;
    
    // 입력 필드 포커스 가능성 확인
    const inputs = document.querySelectorAll('input');
    results.inputFieldsFocusable = inputs.length > 0;
    
    return results;
  }
  
  /**
   * TC-005: 화면 회전 대응 테스트
   */
  async testOrientationChange() {
    if (!this.isMobile) {
      return { skipped: true, reason: '모바일 디바이스가 아닙니다' };
    }
    
    const results = {
      orientationChangeSupported: false,
      layoutMaintained: false
    };
    
    // 화면 회전 이벤트 지원 확인
    results.orientationChangeSupported = 'onorientationchange' in window;
    
    // 현재 레이아웃 상태 확인
    const beforeWidth = window.innerWidth;
    const beforeHeight = window.innerHeight;
    
    // 시뮬레이션을 위해 viewport 변경 이벤트 발생
    window.dispatchEvent(new Event('resize'));
    
    // 레이아웃 유지 확인
    setTimeout(() => {
      const afterWidth = window.innerWidth;
      const afterHeight = window.innerHeight;
      results.layoutMaintained = (beforeWidth === afterWidth && beforeHeight === afterHeight) ||
                                (beforeWidth === afterHeight && beforeHeight === afterWidth);
    }, 100);
    
    return results;
  }
  
  /**
   * TC-008: 초기 로딩 성능 테스트
   */
  async testInitialLoadingPerformance() {
    const results = {
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      authGuardInitTime: 0,
      totalLoadTime: 0
    };
    
    // Performance API 사용
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationTiming = performance.getEntriesByType('navigation')[0];
      if (navigationTiming) {
        results.totalLoadTime = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
      }
      
      // Paint timing
      const paintTimings = performance.getEntriesByType('paint');
      paintTimings.forEach(timing => {
        if (timing.name === 'first-contentful-paint') {
          results.firstContentfulPaint = timing.startTime;
        }
      });
    }
    
    // AuthGuard 초기화 시간 측정 (window.authGuard가 있는 경우)
    if (window.getAuthGuard) {
      const authGuard = window.getAuthGuard();
      if (authGuard) {
        results.authGuardInitTime = Date.now() - this.startTime;
      }
    }
    
    // 성능 기준 검증
    if (results.firstContentfulPaint > 1500) {
      throw new Error(`First Contentful Paint가 느립니다: ${results.firstContentfulPaint}ms`);
    }
    
    if (results.totalLoadTime > 3000) {
      throw new Error(`전체 로딩 시간이 초과되었습니다: ${results.totalLoadTime}ms`);
    }
    
    return results;
  }
  
  /**
   * TC-009: 메모리 사용량 테스트
   */
  async testMemoryUsage() {
    const results = {
      initialMemory: 0,
      peakMemory: 0,
      memoryLeakDetected: false
    };
    
    // Performance Memory API 사용 (Chrome에서만 지원)
    if ('memory' in performance) {
      results.initialMemory = performance.memory.usedJSHeapSize;
      
      // 가비지 컬렉션 강제 실행 (가능한 경우)
      if ('gc' in window) {
        window.gc();
      }
      
      // 메모리 사용량 재측정
      setTimeout(() => {
        results.peakMemory = performance.memory.usedJSHeapSize;
        results.memoryLeakDetected = results.peakMemory > results.initialMemory * 1.5;
      }, 1000);
    }
    
    return results;
  }
  
  /**
   * 유틸리티: 로딩 완료 대기
   */
  async waitForLoadingComplete() {
    return new Promise((resolve) => {
      const checkLoading = () => {
        const loadingOverlay = this.elements.loadingOverlay;
        if (!loadingOverlay || getComputedStyle(loadingOverlay).display === 'none') {
          resolve();
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }
  
  /**
   * 유틸리티: 인증 체크 완료 대기
   */
  async waitForAuthCheckComplete() {
    return new Promise((resolve) => {
      const checkAuth = () => {
        const authGuard = window.getAuthGuard && window.getAuthGuard();
        if (authGuard && authGuard.isAuthCheckComplete()) {
          resolve();
        } else {
          setTimeout(checkAuth, 100);
        }
      };
      checkAuth();
    });
  }
  
  /**
   * 테스트 결과 UI 생성
   */
  createReportUI() {
    if (document.getElementById('qa-test-report')) {
      return; // 이미 생성됨
    }
    
    const reportDiv = document.createElement('div');
    reportDiv.id = 'qa-test-report';
    reportDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      overflow-y: auto;
      background: white;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      display: none;
    `;
    
    reportDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">
        QA Test Report
        <button onclick="this.parentElement.parentElement.style.display='none'" style="float: right;">×</button>
      </div>
      <div id="qa-test-results"></div>
      <div style="margin-top: 10px;">
        <button onclick="window.mobileQATest.runAllTests()" style="width: 100%;">Run All Tests</button>
      </div>
    `;
    
    document.body.appendChild(reportDiv);
  }
  
  /**
   * 테스트 결과 UI 업데이트
   */
  updateReportUI() {
    const reportElement = document.getElementById('qa-test-results');
    if (!reportElement) return;
    
    let html = `<div>Browser: ${this.browserType}</div>`;
    html += `<div>Mobile: ${this.isMobile ? 'Yes' : 'No'}</div>`;
    html += '<hr>';
    
    this.testResults.forEach(test => {
      const statusColor = test.status === 'passed' ? 'green' : 
                         test.status === 'failed' ? 'red' : 'orange';
      
      html += `
        <div style="margin: 5px 0;">
          <div style="color: ${statusColor};">
            ${test.name}: ${test.status.toUpperCase()}
          </div>
          <div style="font-size: 10px; color: #666;">
            ${test.duration}ms
          </div>
          ${test.error ? `<div style="font-size: 10px; color: red;">${test.error}</div>` : ''}
        </div>
      `;
    });
    
    reportElement.innerHTML = html;
    
    // 리포트 표시
    document.getElementById('qa-test-report').style.display = 'block';
  }
  
  /**
   * 최종 테스트 보고서 생성
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(t => t.status === 'passed').length;
    const failedTests = this.testResults.filter(t => t.status === 'failed').length;
    const totalDuration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      browserInfo: this.browserInfo,
      browserType: this.browserType,
      isMobile: this.isMobile,
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: Math.round((passedTests / totalTests) * 100),
        totalDuration
      },
      testResults: this.testResults
    };
    
    console.log('[QA_TEST] 최종 테스트 보고서:', report);
    
    // 로컬 스토리지에 결과 저장
    try {
      localStorage.setItem('qa-test-report', JSON.stringify(report));
    } catch (e) {
      console.warn('[QA_TEST] 테스트 결과 저장 실패:', e);
    }
    
    return report;
  }
  
  /**
   * 테스트 결과 다운로드
   */
  downloadReport() {
    const report = this.generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-test-report-${this.browserType}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 전역 인스턴스 생성
window.mobileQATest = new MobileQATestRunner();

// 페이지 로드 완료 후 자동 실행 (옵션)
if (window.location.search.includes('autotest=true')) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.mobileQATest.runAllTests();
    }, 2000);
  });
}

// 콘솔에서 사용할 수 있는 명령어들
console.log(`
[QA_TEST] 모바일 QA 테스트 도구가 준비되었습니다.

사용 가능한 명령어:
- mobileQATest.runAllTests()           // 전체 테스트 실행
- mobileQATest.generateReport()        // 보고서 생성
- mobileQATest.downloadReport()        // 보고서 다운로드

URL 파라미터:
- ?autotest=true                       // 페이지 로드 후 자동 테스트 실행
`);

// AuthGuard와의 통합을 위한 이벤트 리스너
document.addEventListener('DOMContentLoaded', () => {
  // AuthGuard 초기화 완료 이벤트 대기
  const checkAuthGuard = () => {
    if (window.getAuthGuard && window.getAuthGuard()) {
      console.log('[QA_TEST] AuthGuard 감지됨, 테스트 준비 완료');
      window.mobileQATest.cacheElements(); // 요소 재캐싱
    } else {
      setTimeout(checkAuthGuard, 500);
    }
  };
  
  setTimeout(checkAuthGuard, 1000);
});
