# 보안 정책 검증 테스트 시나리오

## 개요
이 문서는 TODO-LIST 애플리케이션의 보안 정책(RLS, JWT 인증)을 검증하기 위한 테스트 시나리오를 정의합니다.

## 테스트 사용자 계정

### 테스트 사용자 1
- **이메일**: testuser1@example.com
- **비밀번호**: TestPassword123!
- **역할**: 일반 사용자

### 테스트 사용자 2  
- **이메일**: testuser2@example.com
- **비밀번호**: TestPassword456!
- **역할**: 일반 사용자

## 테스트 시나리오

### 1. 정상적인 사용자 인증 및 데이터 접근

#### 시나리오 1-1: 사용자 본인 데이터 CRUD
**목적**: 정상적인 인증된 사용자가 본인 데이터에 접근하는 시나리오

**단계**:
1. testuser1@example.com으로 로그인
2. 새로운 할 일 생성: "Test Task 1"
3. 생성된 할 일 조회 확인
4. 할 일 내용 수정: "Updated Test Task 1"
5. 할 일 완료 상태 변경
6. 할 일 삭제

**예상 결과**: ✅ 모든 CRUD 작업이 성공적으로 수행됨

**검증 방법**:
```javascript
// 브라우저 개발자 도구에서 실행
const session = await supabase.auth.getSession();
console.log("Current user:", session.data.session?.user?.id);

// 할 일 생성 테스트
const { data, error } = await supabase
  .from('todos')
  .insert({ title: 'Test Task 1', user_id: session.data.session.user.id });
console.log("Insert result:", data, error);
```

### 2. 무권한 접근 차단 테스트

#### 시나리오 2-1: 타 사용자 데이터 접근 차단
**목적**: 사용자가 다른 사용자의 데이터에 접근하지 못함을 확인

**단계**:
1. testuser1@example.com으로 로그인하여 할 일 생성
2. 생성된 할 일의 ID 기록
3. testuser2@example.com으로 로그인
4. testuser1의 할 일 ID로 조회 시도
5. testuser1의 할 일 수정 시도
6. testuser1의 할 일 삭제 시도

**예상 결과**: ❌ 모든 접근 시도가 차단됨 (빈 결과 또는 403 오류)

**검증 방법**:
```javascript
// testuser2로 로그인 후 testuser1의 데이터 접근 시도
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .eq('id', 'testuser1_todo_id');
console.log("Cross-user access result:", data, error);
// 예상: data는 빈 배열, error는 없음 (RLS 정책에 의해 필터링됨)
```

#### 시나리오 2-2: 비로그인 상태 접근 차단
**목적**: 인증되지 않은 사용자의 모든 데이터 접근 차단

**단계**:
1. 브라우저에서 로그아웃 수행
2. 할 일 목록 조회 시도
3. 할 일 생성 시도
4. 기존 할 일 수정 시도

**예상 결과**: ❌ 모든 요청이 401/403 오류 또는 빈 결과 반환

**검증 방법**:
```javascript
// 로그아웃 후 테스트
await supabase.auth.signOut();

const { data, error } = await supabase
  .from('todos')
  .select('*');
console.log("Unauthenticated access result:", data, error);
// 예상: 빈 결과 또는 인증 오류
```

### 3. JWT 토큰 만료 처리 테스트

#### 시나리오 3-1: 만료된 토큰으로 접근
**목적**: 만료된 JWT 토큰 사용 시 적절한 처리 확인

**단계**:
1. 정상 로그인하여 JWT 토큰 획득
2. 브라우저 개발자 도구에서 토큰 만료 시뮬레이션
3. 만료된 토큰으로 API 요청 시도
4. 자동 재로그인 안내 확인

**검증 방법**:
```javascript
// 토큰 만료 시뮬레이션
const session = await supabase.auth.getSession();
console.log("Token expires at:", new Date(session.data.session.expires_at * 1000));

// 수동으로 토큰 무효화 후 요청
localStorage.removeItem('supabase.auth.token');
const { data, error } = await supabase.from('todos').select('*');
console.log("Expired token result:", data, error);
```

### 4. SQL 인젝션 방지 테스트

#### 시나리오 4-1: 악의적인 입력값 처리
**목적**: SQL 인젝션 공격 시도가 차단됨을 확인

**단계**:
1. 정상 로그인
2. 할 일 제목에 SQL 인젝션 코드 입력 시도
3. 검색 필터에 악의적인 코드 입력 시도

**테스트 입력값**:
```javascript
const maliciousInputs = [
  "'; DROP TABLE todos; --",
  "1' OR '1'='1",
  "<script>alert('XSS')</script>",
  "../../etc/passwd",
  "${system('rm -rf /')}"
];

// 각 입력값으로 할 일 생성 시도
for (const input of maliciousInputs) {
  const { data, error } = await supabase
    .from('todos')
    .insert({ title: input, user_id: session.user.id });
  console.log(`Input "${input}" result:`, data, error);
}
```

### 5. 네트워크 레벨 보안 테스트

#### 시나리오 5-1: API 키 노출 방지
**목적**: 민감한 정보가 클라이언트에 노출되지 않음 확인

**검증 사항**:
- [ ] anon 키만 사용되고 service_role 키는 노출되지 않음
- [ ] JWT 토큰이 localStorage에 안전하게 저장됨
- [ ] HTTPS 연결 강제 (개발환경 제외)

#### 시나리오 5-2: CORS 정책 확인
**목적**: 허용되지 않은 도메인에서의 접근 차단

**검증 방법**:
```javascript
// 다른 도메인에서 API 호출 시도 (Postman 등 사용)
fetch('https://eybuksswxwbvpuyhvocb.supabase.co/rest/v1/todos', {
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer invalid-token'
  }
});
// 예상: CORS 오류 또는 인증 오류
```

## 테스트 실행 체크리스트

### 사전 준비
- [ ] 테스트 사용자 계정 2개 생성
- [ ] RLS 정책이 todos 테이블에 적용되어 있는지 확인
- [ ] 브라우저 개발자 도구 준비

### 테스트 수행
- [ ] 시나리오 1-1: 정상 사용자 CRUD 테스트
- [ ] 시나리오 2-1: 타 사용자 데이터 접근 차단 테스트  
- [ ] 시나리오 2-2: 비로그인 접근 차단 테스트
- [ ] 시나리오 3-1: 만료된 토큰 처리 테스트
- [ ] 시나리오 4-1: SQL 인젝션 방지 테스트
- [ ] 시나리오 5-1: API 키 노출 방지 확인
- [ ] 시나리오 5-2: CORS 정책 확인

### 결과 문서화
- [ ] 각 테스트 시나리오별 통과/실패 기록
- [ ] 발견된 보안 이슈 목록 작성
- [ ] 개선 권고사항 정리

## 자동화 테스트 스크립트

```javascript
// 보안 테스트 자동화 스크립트
class SecurityTestSuite {
  constructor() {
    this.results = [];
  }

  async runAllTests() {
    console.log("🔒 보안 테스트 시작");
    
    await this.testUserDataIsolation();
    await this.testUnauthenticatedAccess();
    await this.testTokenValidation();
    
    this.printResults();
  }

  async testUserDataIsolation() {
    try {
      // 사용자 간 데이터 격리 테스트
      const result = await supabase.from('todos').select('*');
      const hasOtherUserData = result.data.some(todo => 
        todo.user_id !== (await supabase.auth.getUser()).data.user.id
      );
      
      this.results.push({
        test: "데이터 격리",
        passed: !hasOtherUserData,
        message: hasOtherUserData ? "타 사용자 데이터 접근 가능" : "정상 격리됨"
      });
    } catch (e) {
      this.results.push({
        test: "데이터 격리",
        passed: false,
        message: `테스트 오류: ${e.message}`
      });
    }
  }

  async testUnauthenticatedAccess() {
    try {
      await supabase.auth.signOut();
      const result = await supabase.from('todos').select('*');
      
      this.results.push({
        test: "비인증 접근 차단",
        passed: result.data.length === 0,
        message: result.data.length === 0 ? "접근 차단됨" : "접근 허용됨"
      });
    } catch (e) {
      this.results.push({
        test: "비인증 접근 차단",
        passed: true,
        message: "오류로 인한 접근 차단 (정상)"
      });
    }
  }

  async testTokenValidation() {
    // JWT 토큰 검증 테스트 구현
    // ...
  }

  printResults() {
    console.log("\n📊 보안 테스트 결과:");
    this.results.forEach(result => {
      const icon = result.passed ? "✅" : "❌";
      console.log(`${icon} ${result.test}: ${result.message}`);
    });
  }
}

// 테스트 실행
// const securityTest = new SecurityTestSuite();
// await securityTest.runAllTests();
```

## 보안 검증 완료 기준

모든 테스트 시나리오가 통과해야 보안 정책이 올바르게 적용된 것으로 판단합니다:

1. ✅ 인증된 사용자의 본인 데이터 CRUD 정상 동작
2. ❌ 타 사용자 데이터 접근 완전 차단
3. ❌ 비로그인 상태 데이터 접근 완전 차단
4. ✅ 토큰 만료 시 적절한 재인증 유도
5. ❌ SQL 인젝션 등 악의적 입력 차단
6. ✅ API 키 및 토큰 보안 관리

모든 기준을 충족하면 프로덕션 환경에 배포할 수 있는 보안 수준을 달성한 것입니다.
