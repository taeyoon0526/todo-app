# Google OAuth 설정 가이드

이 가이드는 TODO 앱에서 Google OAuth 로그인을 활성화하는 방법을 설명합니다.

## 1. Google Cloud Console 설정

### 1.1 프로젝트 생성/선택
1. [Google Cloud Console](https://console.cloud.google.com/)에 로그인
2. 새 프로젝트를 생성하거나 기존 프로젝트 선택

### 1.2 OAuth 동의 화면 설정
1. 좌측 메뉴 → APIs & Services → OAuth consent screen
2. User Type: External 선택 (개인 개발자인 경우)
3. 필수 정보 입력:
   - App name: "TODO 앱"
   - User support email: 본인 이메일
   - Developer contact information: 본인 이메일

### 1.3 OAuth 2.0 클라이언트 ID 생성
1. 좌측 메뉴 → APIs & Services → Credentials
2. "+ CREATE CREDENTIALS" → OAuth 2.0 Client IDs
3. Application type: Web application
4. Name: "TODO App OAuth Client"
5. Authorized JavaScript origins 추가:
   ```
   http://localhost:8000
   https://yourdomain.com  (배포 시)
   ```
6. Authorized redirect URIs 추가:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
7. 생성 후 Client ID와 Client Secret 복사

## 2. Supabase 설정

### 2.1 Google Provider 활성화
1. [Supabase Dashboard](https://app.supabase.com/) 로그인
2. 프로젝트 선택 → Authentication → Providers
3. Google 찾아서 토글 활성화

### 2.2 Google OAuth 정보 입력
1. Client ID: Google Console에서 복사한 Client ID 입력
2. Client Secret: Google Console에서 복사한 Client Secret 입력
3. Redirect URL 확인: `https://your-project-id.supabase.co/auth/v1/callback`

### 2.3 Site URL 설정
1. Authentication → Settings
2. Site URL에 다음 입력:
   ```
   http://localhost:8000  (개발용)
   https://yourdomain.com (배포용)
   ```

## 3. 앱 테스트

1. 로컬 서버 실행:
   ```bash
   cd /path/to/todo-app
   python3 -m http.server 8000
   ```

2. 브라우저에서 `http://localhost:8000` 접속

3. "구글로 로그인" 또는 "구글로 계정 만들기" 버튼 클릭

4. Google 로그인 팝업이 나타나면 계정 선택

5. 권한 동의 후 자동으로 TODO 앱에 로그인됨

## 4. 문제 해결

### 오류: "redirect_uri_mismatch"
- Google Console의 Authorized redirect URIs에 Supabase callback URL이 정확히 등록되었는지 확인

### 오류: "invalid_client"
- Supabase에 입력한 Client ID/Secret이 정확한지 확인

### 오류: "unauthorized_client"
- Google OAuth 동의 화면이 올바르게 설정되었는지 확인

## 5. 보안 고려사항

- Client Secret은 절대 프론트엔드 코드에 노출하지 말 것
- 운영 환경에서는 HTTPS 필수
- 신뢰할 수 있는 도메인만 redirect URI에 등록
- 정기적으로 OAuth 토큰 및 권한 검토

## 6. 배포 시 추가 설정

배포 시에는 다음 설정을 업데이트해야 합니다:

1. Google Console:
   - Authorized JavaScript origins에 배포 도메인 추가
   
2. Supabase:
   - Site URL을 배포 도메인으로 업데이트
   
3. 앱 코드:
   - redirectTo URL을 배포 도메인으로 수정 (현재는 window.location.origin 사용으로 자동 처리됨)
