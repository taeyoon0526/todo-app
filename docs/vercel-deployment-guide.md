# Vercel 배포 가이드

## 개요
TODO-LIST 애플리케이션을 Vercel에 배포하기 위한 완전한 가이드입니다.

**🚀 앱 아키텍처**: 
- **프론트엔드**: HTML5 + CSS3 + Vanilla JavaScript (정적 배포)
- **백엔드**: Supabase (서버리스 데이터베이스 + 인증)
- **결과**: 완전한 동적 웹 애플리케이션

**✨ 동적 기능들**:
- 실시간 회원가입/로그인
- JWT 토큰 기반 인증
- 실시간 할 일 CRUD 작업
- 사용자별 데이터 격리 (RLS)

## 1. Vercel 계정 및 프로젝트 설정

### 1.1 Vercel 계정 생성
1. [Vercel 웹사이트](https://vercel.com)에 접속
2. GitHub 계정으로 로그인 (권장)
3. 무료 Hobby 플랜 선택

### 1.2 GitHub 리포지토리 연동
1. 현재 프로젝트를 GitHub에 푸시
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/taeyoon0526/todo-app.git
git push -u origin main
```

## 2. Vercel 프로젝트 생성

### 2.1 새 프로젝트 생성
1. Vercel 대시보드에서 "New Project" 클릭
2. GitHub 리포지토리 `taeyoon0526/todo-app` 선택
3. "Import" 클릭

### 2.2 프로젝트 설정
```
Project Name: todo-app
Framework Preset: Other (Static Site)
Root Directory: ./
Build Command: npm run build (또는 비워둠)
Output Directory: (비워둠 - 루트 디렉토리 사용)
Install Command: (비워둠 - 종속성 없음)
```

**💡 중요**: 이 앱은 **정적 프론트엔드 + 서버리스 백엔드(Supabase)** 아키텍처로 
완전한 동적 웹 애플리케이션입니다!

## 3. 환경변수 설정

### 3.1 Vercel 대시보드에서 환경변수 추가
1. 프로젝트 설정 → Environment Variables 이동
2. 다음 환경변수들을 추가:

```
Name: VITE_SUPABASE_URL
Value: https://eybuksswxwbvpuyhvocb.supabase.co
Environment: Production, Preview, Development

Name: VITE_SUPABASE_ANON_KEY  
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw
Environment: Production, Preview, Development
```

### 3.2 로컬 개발용 환경변수 파일
`.env.local` 파일 생성 (프로젝트 루트):
```env
VITE_SUPABASE_URL=https://eybuksswxwbvpuyhvocb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw
```

⚠️ **중요**: `.env.local` 파일을 `.gitignore`에 추가하여 GitHub에 업로드되지 않도록 설정

## 4. 배포 실행

### 4.1 자동 배포
1. GitHub에 코드 푸시하면 자동으로 Vercel에서 배포 시작
2. Vercel 대시보드에서 배포 진행상황 확인
3. 배포 완료 후 생성된 URL로 접속 확인

### 4.2 수동 배포 (선택적)
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서 실행
vercel

# 프로덕션 배포
vercel --prod
```

## 5. 도메인 설정 (선택적)

### 5.1 커스텀 도메인 연결
1. Vercel 프로젝트 → Settings → Domains
2. 도메인 입력 (예: todoapp.yourname.com)
3. DNS 설정 안내에 따라 도메인 제공업체에서 설정

### 5.2 HTTPS 자동 적용
- Vercel은 모든 도메인에 자동으로 Let's Encrypt SSL 인증서 적용
- HTTP → HTTPS 자동 리다이렉트 설정됨

## 6. 성능 최적화 설정

### 6.1 CDN 및 캐싱
- `vercel.json`에 이미 캐싱 헤더 설정됨
- 정적 파일들은 전세계 CDN으로 빠르게 제공
- Edge Functions 활용 가능 (필요 시)

### 6.2 압축 및 최적화
```json
// vercel.json에 추가 (필요 시)
{
  "functions": {
    "scripts/*.js": {
      "maxDuration": 10
    }
  }
}
```

## 7. 모니터링 및 분석

### 7.1 Vercel Analytics
1. 프로젝트 → Analytics 탭
2. 페이지 성능, 방문자 통계 확인
3. Core Web Vitals 모니터링

### 7.2 로그 확인
1. 프로젝트 → Functions 탭
2. 실시간 로그 및 에러 확인
3. 성능 메트릭 분석

## 8. 배포 후 확인사항

### 8.1 기능 테스트
- [ ] 회원가입/로그인 정상 동작
- [ ] 할 일 CRUD 정상 동작
- [ ] 반응형 UI 정상 표시
- [ ] HTTPS 연결 확인
- [ ] 모든 브라우저에서 정상 동작

### 8.2 보안 설정 확인
- [ ] 환경변수 올바르게 적용됨
- [ ] Supabase RLS 정책 동작
- [ ] JWT 토큰 정상 처리
- [ ] CORS 설정 확인

## 9. 지속적 배포 (CI/CD)

### 9.1 자동 배포 흐름
```
GitHub Push → Vercel Build → Deploy → Live URL
```

### 9.2 브랜치별 배포
- `main` 브랜치: 프로덕션 환경
- `develop` 브랜치: 스테이징 환경 (Preview)
- Feature 브랜치: 임시 Preview URL

## 10. 문제 해결

### 10.1 일반적인 오류
**Q: 환경변수가 적용되지 않아요**
A: Vercel 대시보드에서 환경변수 재설정 후 재배포

**Q: Supabase 연결이 안돼요**
A: CORS 설정에서 Vercel 도메인 추가 확인

**Q: 빌드가 실패해요**
A: 종속성 문제 - package.json 확인 및 재설정

### 10.2 성능 이슈
- Lighthouse 스코어 확인
- 이미지 최적화 적용
- 불필요한 스크립트 제거

## 11. 배포 체크리스트

배포 전 최종 확인:
- [ ] `.env.local` 파일이 `.gitignore`에 포함됨
- [ ] 프로덕션 환경변수 Vercel에 설정됨
- [ ] RLS 정책 Supabase에 적용됨
- [ ] 모든 기능 로컬에서 테스트 완료
- [ ] 보안 테스트 통과
- [ ] 반응형 디자인 확인

배포 후 확인:
- [ ] 라이브 URL 접속 확인
- [ ] 전체 사용자 플로우 테스트
- [ ] 성능 메트릭 확인
- [ ] 에러 로그 모니터링

---

## 빠른 배포 명령어

```bash
# 1. GitHub에 푸시
git add .
git commit -m "Deploy to Vercel"
git push origin main

# 2. Vercel에서 자동 빌드 시작
# 3. 생성된 URL에서 확인
```

**배포 URL**: https://todo-app-taeyoon0526.vercel.app (예시)

성공적인 배포를 위해 단계별로 천천히 진행하세요! 🚀
