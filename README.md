# TODO-LIST Application

## 🔒 보안 설정

### Content Security Policy (CSP) 및 보안 헤더

이 애플리케이션은 `vercel.json`을 통해 강화된 보안 헤더를 적용하고 있습니다:

#### 적용된 보안 헤더

1. **Content-Security-Policy**: XSS 공격 방지
   - `default-src 'self'`: 기본적으로 같은 오리진만 허용
   - `script-src 'self' 'nonce-todolist2025'`: nonce를 통한 안전한 스크립트 실행
   - `style-src 'self' 'unsafe-inline'`: 스타일 시트 제어
   - `connect-src 'self' *.supabase.co`: Supabase API 연결 허용

2. **X-Frame-Options: DENY**: 클릭재킹 공격 방지

3. **X-Content-Type-Options: nosniff**: MIME 타입 스니핑 방지

4. **X-XSS-Protection: 1; mode=block**: 브라우저 XSS 필터 활성화

5. **Referrer-Policy**: 리퍼러 정보 제어

6. **Strict-Transport-Security**: HTTPS 강제

7. **Permissions-Policy**: 브라우저 API 접근 제어

8. **Cross-Origin-*-Policy**: CORS 및 크로스 오리진 보안

#### 보안 테스트

보안 헤더가 올바르게 적용되었는지 확인하려면:

1. 애플리케이션 배포 후 `/security-test.html` 페이지 방문
2. 각 테스트 버튼을 클릭하여 보안 기능 확인
3. 브라우저 개발자 도구의 Network 탭에서 응답 헤더 확인

#### CSRF 보호

애플리케이션에는 Double Submit Cookie 패턴을 사용한 CSRF 보호가 구현되어 있습니다:

- `scripts/security.js`: 클라이언트 측 CSRF 토큰 생성 및 검증
- `supabase/functions/csrf-validation/`: 서버 측 CSRF 검증

#### XSS 방지

- 모든 사용자 입력은 `XSSProtection.sanitizeInput()` 함수를 통해 정화
- CSP 헤더를 통한 인라인 스크립트 실행 방지
- nonce 기반 스크립트 실행으로 안전성 확보

## 🚀 배포 및 실행

### Vercel 배포

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel --prod
```

배포 후 보안 헤더는 자동으로 적용됩니다.

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 📋 프로젝트 구조

```
todo-app/
├── index.html                 # 메인 애플리케이션
├── security-test.html         # 보안 헤더 테스트 페이지
├── vercel.json               # Vercel 설정 및 보안 헤더
├── scripts/
│   ├── main.js              # 메인 애플리케이션 로직
│   ├── api.js               # API 호출 함수들
│   ├── auth.js              # 인증 관련 함수들
│   └── security.js          # 보안 관련 함수들 (CSRF, XSS)
├── supabase/functions/
│   └── csrf-validation/     # CSRF 검증 Edge Function
└── database/security/
    └── rls_policies.sql     # Row Level Security 정책
```

## 🔧 기술 스택

- **Frontend**: Vanilla JavaScript, Material Design Lite
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deploy**: Vercel
- **Security**: CSP, CSRF Protection, XSS Prevention, RLS

## 🛡️ 보안 고려사항

1. **인증**: Supabase Auth를 통한 안전한 사용자 인증
2. **데이터 격리**: Row Level Security (RLS)를 통한 사용자별 데이터 격리
3. **HTTPS**: Vercel을 통한 자동 HTTPS 적용
4. **헤더 보안**: 포괄적인 보안 헤더 적용
5. **입력 검증**: 클라이언트 및 서버 측 입력 검증
