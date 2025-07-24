# TODO-LIST Application - Security Configuration
# T-034 구현의 일부 - 보안 강화 설정

# Supabase 데이터베이스 보안 설정 가이드

## 1. RLS 정책 적용 방법

### Supabase Dashboard에서 실행할 SQL:

```sql
-- 1. RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. 정책 생성 (database/security/rls_policies.sql 파일 참조)
-- 해당 파일의 내용을 Supabase SQL Editor에서 실행하세요.
```

## 2. 추가 보안 설정

### Authentication 설정:
- Enable email confirmations: ✅
- Strong password requirements: 최소 8자, 영문+숫자 조합
- Rate limiting: 분당 5회 로그인 시도 제한
- CAPTCHA: 민감한 작업에 대해 활성화

### API 설정:
- Request rate limits: 분당 100회
- CORS 설정: 특정 도메인만 허용
- Request logging: 모든 API 요청 로깅

### Database 설정:
- Audit logging: 데이터 변경 사항 추적
- Connection limits: 동시 연결 제한
- SSL enforcement: 모든 연결에 SSL 강제

## 3. 보안 헤더 설정

Vercel에서 다음 헤더를 설정하세요 (vercel.json에 추가됨):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' *.supabase.co"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 4. CSRF 보호 설정

### 클라이언트 설정:
- CSRF 토큰이 모든 요청에 자동으로 포함됩니다
- Double Submit Cookie 패턴 사용
- SameSite=Strict 쿠키 설정

### 서버 설정:
- Edge Function을 통한 CSRF 토큰 검증
- supabase/functions/csrf-validation/index.ts 배포 필요

## 5. 데이터베이스 스키마 보안

### 테이블 권한:
- anon 역할: RLS 정책을 통해서만 접근
- authenticated 역할: 자신의 데이터만 접근
- service_role: 관리 작업에만 사용

### 인덱스 보안:
- user_id 기반 인덱스로 성능 최적화
- 민감한 데이터는 별도 테이블로 분리

## 6. 모니터링 및 알림

### 로그 모니터링:
- 비정상적인 로그인 시도
- CSRF 토큰 검증 실패
- SQL 인젝션 시도
- 과도한 API 요청

### 알림 설정:
- 보안 이벤트 발생 시 즉시 알림
- 주간 보안 리포트
- 취약점 스캔 결과

## 7. 정기 보안 점검

### 월간 점검 항목:
- [ ] RLS 정책 유효성 검증
- [ ] 사용자 권한 검토
- [ ] API 키 순환
- [ ] 로그 분석
- [ ] 취약점 스캔

### 분기별 점검 항목:
- [ ] 보안 패치 적용
- [ ] 침투 테스트
- [ ] 백업 복구 테스트
- [ ] 보안 정책 업데이트

## 8. 사고 대응 절차

### 보안 사고 발생 시:
1. 즉시 의심스러운 연결 차단
2. 로그 백업 및 분석
3. 영향 범위 파악
4. 사용자 알림
5. 보안 패치 적용
6. 사후 분석 및 개선

## 9. 개발자 가이드라인

### 코딩 보안 규칙:
- 모든 사용자 입력 검증
- SQL 인젝션 방지 (Parameterized Query)
- XSS 방지 (입력 이스케이프)
- CSRF 토큰 항상 확인
- 민감한 데이터 암호화

### 배포 보안 규칙:
- 환경변수로 민감한 정보 관리
- HTTPS 강제 사용
- 프로덕션에서 디버그 모드 비활성화
- 정기적인 의존성 업데이트

## 10. 규정 준수

### GDPR 준수:
- 사용자 데이터 최소 수집
- 데이터 삭제 권리 보장
- 데이터 처리 목적 명시
- 개인정보처리방침 제공

### 국내 개인정보보호법 준수:
- 개인정보 수집·이용 동의
- 개인정보처리방침 공개
- 개인정보보호책임자 지정
- 개인정보 파기 절차
