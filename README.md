# TODO-LIST 애플리케이션

> 현대적인 웹 기반 할 일 관리 애플리케이션

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/taeyoon0526/todo-app)

## 🚀 라이브 데모

**배포된 애플리케이션**: [https://todo-app-taeyoon0526.vercel.app](https://todo-app-taeyoon0526.vercel.app)

## ✨ 주요 기능

- 🔐 **안전한 사용자 인증**: Supabase Auth 기반 이메일/비밀번호 로그인
- 📝 **할 일 관리**: 생성, 수정, 삭제, 완료 체크
- 📅 **마감일 설정**: D-Day 카운터와 함께 일정 관리
- 🎯 **우선순위**: 3단계 우선순위 (높음/중간/낮음) 설정
- 🔍 **스마트 필터**: 오늘 할 일, 전체 보기 등
- 📱 **반응형 디자인**: 모바일, 태블릿, 데스크톱 완벽 지원
- 🎨 **Material Design**: 구글 Material Design Lite 적용
- 🔒 **강력한 보안**: Row Level Security (RLS)로 데이터 완전 격리

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **UI Framework**: Material Design Lite
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **배포**: Vercel
- **보안**: JWT Authentication, Row Level Security

## 📋 시스템 요구사항

- 모던 웹 브라우저 (Chrome, Firefox, Safari, Edge)
- 인터넷 연결

## 🔧 로컬 개발 설정

### 1. 리포지토리 클론
```bash
git clone https://github.com/taeyoon0526/todo-app.git
cd todo-app
```

### 2. 환경변수 설정
`.env.local` 파일 생성:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. 로컬 서버 실행
```bash
# Python 사용
python -m http.server 8000

# Node.js 사용 (글로벌 설치 필요)
npx serve .

# Live Server (VS Code 확장) 사용
# VS Code에서 index.html 우클릭 → "Open with Live Server"
```

### 4. 브라우저에서 확인
http://localhost:8000 접속

## 🚀 Vercel 배포

### 자동 배포 (권장)
1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com)에서 GitHub 리포지토리 연결
3. 환경변수 설정
4. 자동 배포 완료!

### 수동 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포 실행
vercel

# 프로덕션 배포
vercel --prod
```

상세한 배포 가이드: [docs/vercel-deployment-guide.md](docs/vercel-deployment-guide.md)

## 📁 프로젝트 구조

```
todo-app/
├── index.html              # 메인 HTML 파일
├── styles.css              # 스타일시트
├── scripts/
│   ├── api.js              # Supabase 클라이언트 설정
│   ├── auth.js             # 인증 관련 함수
│   └── main.js             # 메인 애플리케이션 로직
├── database/
│   └── rls-policies.sql    # RLS 정책 SQL
├── docs/                   # 문서
│   ├── vercel-deployment-guide.md
│   ├── rls-security-guide.md
│   ├── security-test-scenarios.md
│   └── final-security-review.md
├── vercel.json             # Vercel 배포 설정
├── package.json            # 프로젝트 메타데이터
└── README.md               # 이 파일
```

## 🔐 보안 기능

- **Row Level Security (RLS)**: 사용자별 데이터 완전 격리
- **JWT 인증**: 안전한 토큰 기반 인증
- **자동 토큰 관리**: 만료 감지 및 자동 갱신
- **입력값 검증**: XSS, SQL 인젝션 방지
- **HTTPS 강제**: 모든 통신 암호화

## 🧪 테스트

보안 테스트 시나리오: [docs/security-test-scenarios.md](docs/security-test-scenarios.md)

```bash
# 보안 테스트 실행 (브라우저 개발자 도구에서)
const securityTest = new SecurityTestSuite();
await securityTest.runAllTests();
```

## 📊 성능

- **LCP**: < 1초 (Largest Contentful Paint)
- **FCP**: < 0.5초 (First Contentful Paint)
- **TTI**: < 1초 (Time to Interactive)
- **Lighthouse**: 95+ 점수

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 **Shared Source License** 하에 배포됩니다.

### 🔒 라이선스 요약:
- ✅ **보기 전용**: 소스코드 열람 및 학습 목적 사용 가능
- ✅ **개인 사용**: 비상업적 개인 사용 허용
- ❌ **수정 금지**: 코드 수정 및 파생작업 금지
- ❌ **재배포 금지**: 코드 공유 및 재배포 금지
- ❌ **상업적 이용 금지**: 상업적 목적 사용 금지

자세한 라이선스 조건은 [LICENSE](LICENSE) 파일을 참조하세요.

### 📧 문의사항
라이선스와 관련된 질문이나 특별한 권한이 필요한 경우 taeyang7286@gmail.com으로 연락주세요.

## 🙋‍♂️ 지원

이슈가 있거나 질문이 있으시면 [GitHub Issues](https://github.com/taeyoon0526/todo-app/issues)에 문의해주세요.

## 🔗 관련 링크

- [Supabase 문서](https://supabase.io/docs)
- [Material Design Lite](https://getmdl.io/)
- [Vercel 문서](https://vercel.com/docs)

---

⭐ 이 프로젝트가 도움이 되셨다면 별표를 눌러주세요!
