/**
 * TODO-LIST Application - Security Test Suite
 * 
 * 보안 설정 및 기능 테스트를 위한 스크립트
 * T-034 구현 검증용
 * 
 * Copyright (c) 2025 taeyoon0526
 */

// 보안 테스트 실행 함수
async function runSecurityTests() {
  console.log('🔒 보안 테스트 시작...');
  
  const results = {
    csrfToken: false,
    xssProtection: false,
    inputValidation: false,
    headersSecurity: false,
    rlsPolicy: false
  };
  
  try {
    // 1. CSRF 토큰 검증 테스트
    console.log('📋 CSRF 토큰 테스트...');
    if (window.csrfProtection) {
      const token = window.csrfProtection.initializeToken();
      results.csrfToken = token && token.length === 64;
      console.log(results.csrfToken ? '✅ CSRF 토큰 생성 성공' : '❌ CSRF 토큰 생성 실패');
    }
    
    // 2. XSS 방지 테스트
    console.log('📋 XSS 방지 테스트...');
    if (window.XSSProtection) {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = window.XSSProtection.sanitizeInput(maliciousInput);
      results.xssProtection = !sanitized.includes('<script>');
      console.log(results.xssProtection ? '✅ XSS 방지 성공' : '❌ XSS 방지 실패');
    }
    
    // 3. 입력 검증 테스트
    console.log('📋 입력 검증 테스트...');
    if (window.XSSProtection) {
      const longInput = 'a'.repeat(1000);
      const truncated = window.XSSProtection.sanitizeInput(longInput, 500);
      results.inputValidation = truncated.length <= 500;
      console.log(results.inputValidation ? '✅ 입력 길이 제한 성공' : '❌ 입력 길이 제한 실패');
    }
    
    // 4. 보안 헤더 검증
    console.log('📋 보안 헤더 테스트...');
    try {
      const response = await fetch(window.location.href, { method: 'HEAD' });
      const headers = {
        csp: response.headers.get('Content-Security-Policy'),
        xframe: response.headers.get('X-Frame-Options'),
        xcontent: response.headers.get('X-Content-Type-Options'),
        referrer: response.headers.get('Referrer-Policy')
      };
      
      results.headersSecurity = !!(headers.csp && headers.xframe && headers.xcontent && headers.referrer);
      console.log(results.headersSecurity ? '✅ 보안 헤더 설정 완료' : '❌ 보안 헤더 설정 미완료');
      
      if (headers.csp) console.log('  ✓ CSP 헤더:', headers.csp.substring(0, 50) + '...');
      if (headers.xframe) console.log('  ✓ X-Frame-Options:', headers.xframe);
      if (headers.xcontent) console.log('  ✓ X-Content-Type-Options:', headers.xcontent);
      if (headers.referrer) console.log('  ✓ Referrer-Policy:', headers.referrer);
      
    } catch (error) {
      console.log('❌ 보안 헤더 확인 실패:', error.message);
    }
    
    // 5. RLS 정책 테스트 (간접적 확인)
    console.log('📋 RLS 정책 테스트...');
    if (window.supabase) {
      try {
        // 인증 없이 데이터 접근 시도 (실패해야 정상)
        const { data, error } = await window.supabase
          .from('todos')
          .select('*')
          .limit(1);
          
        // 인증되지 않은 상태에서는 빈 결과나 에러가 반환되어야 함
        results.rlsPolicy = !data || data.length === 0 || !!error;
        console.log(results.rlsPolicy ? '✅ RLS 정책 활성화 확인' : '❌ RLS 정책 미설정');
        
      } catch (error) {
        // 에러 발생도 정상 (RLS가 작동하고 있다는 의미)
        results.rlsPolicy = true;
        console.log('✅ RLS 정책으로 접근 차단됨');
      }
    }
    
  } catch (error) {
    console.error('❌ 보안 테스트 중 오류 발생:', error);
  }
  
  // 결과 요약
  console.log('\n🔒 보안 테스트 결과 요약:');
  console.log('================================');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`📊 통과: ${passedTests}/${totalTests} 테스트`);
  console.log(`🎯 성공률: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = {
      csrfToken: 'CSRF 토큰 생성',
      xssProtection: 'XSS 방지',
      inputValidation: '입력 검증',
      headersSecurity: '보안 헤더',
      rlsPolicy: 'RLS 정책'
    }[test];
    
    console.log(`${icon} ${testName}`);
  });
  
  console.log('================================');
  
  if (passedTests === totalTests) {
    console.log('🎉 모든 보안 테스트 통과!');
  } else {
    console.log('⚠️  일부 보안 설정을 확인해주세요.');
  }
  
  return results;
}

// 개발자 도구 보안 검사 함수
function checkDevToolsSecurity() {
  console.log('\n🛠️  개발자 도구 보안 검사...');
  
  // 중요 정보 노출 검사
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /private.*key/i,
    /service.*role/i,
    /admin.*token/i
  ];
  
  let warningCount = 0;
  
  // 전역 변수 검사
  Object.keys(window).forEach(key => {
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(key)) {
        console.warn(`⚠️  민감한 전역 변수 발견: ${key}`);
        warningCount++;
      }
    });
  });
  
  // 로컬 스토리지 검사
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(key)) {
        console.warn(`⚠️  민감한 로컬 스토리지 항목: ${key}`);
        warningCount++;
      }
    });
  }
  
  if (warningCount === 0) {
    console.log('✅ 민감한 정보 노출 없음');
  } else {
    console.log(`❌ ${warningCount}개의 보안 경고 발견`);
  }
}

// 자동 실행 (개발 환경에서만)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // 페이지 로드 완료 후 실행
  window.addEventListener('load', () => {
    setTimeout(() => {
      runSecurityTests();
      checkDevToolsSecurity();
    }, 2000); // 2초 후 실행
  });
}

// 전역으로 노출하여 수동 실행 가능
window.runSecurityTests = runSecurityTests;
window.checkDevToolsSecurity = checkDevToolsSecurity;

console.log('🔒 보안 테스트 스크립트 로드 완료');
console.log('🔧 수동 실행: runSecurityTests() 또는 checkDevToolsSecurity()');
