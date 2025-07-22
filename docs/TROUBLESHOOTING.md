## 🔧 문제 해결 가이드

### 1. Supabase 데이터베이스 설정

**첫 번째로 이 파일들을 Supabase SQL Editor에서 순서대로 실행하세요:**

```bash
# 1단계: 간단한 방문자 추적 테이블 생성
docs/simple-visitor-setup.sql

# 2단계: 피드백 시스템 테이블 생성  
docs/feedback-setup.sql
```

### 2. 문제별 해결 방법

#### 🌙 야간 모드가 안되는 문제
- 테마 토글 버튼(`#theme-toggle`)이 HTML에 있는지 확인
- 브라우저 개발자 도구에서 `localStorage.getItem('todo-app-theme')` 확인
- 콘솔에서 `[THEME]` 로그 메시지 확인

#### 📝 피드백이 Supabase에 저장되지 않는 문제
1. `docs/feedback-setup.sql` 실행 확인
2. 브라우저 콘솔에서 피드백 전송 오류 확인
3. Supabase RLS 정책이 올바르게 설정되었는지 확인

#### ⏳ "인증을 확인하고 있습니다..." 무한 로딩
- 5초 타임아웃이 추가되어 자동으로 해결됩니다
- 네트워크 연결 상태 확인
- Supabase 프로젝트 설정 확인

#### 📊 방문자 대시보드 오류
- `docs/simple-visitor-setup.sql` 실행 후 함수가 생성되었는지 확인
- 대체 쿼리 방식으로 작동하도록 수정됨

### 3. 빠른 테스트 방법

#### 피드백 시스템 테스트
```javascript
// 브라우저 콘솔에서 실행
document.querySelector('[data-feedback-trigger]').click();
```

#### 방문자 추적 테스트
```javascript
// 브라우저 콘솔에서 실행
console.log('방문자 추적:', window.visitorTracker);
```

#### 테마 시스템 테스트
```javascript
// 브라우저 콘솔에서 실행
document.getElementById('theme-toggle').click();
```

### 4. Supabase 설정 확인

#### 테이블 생성 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('visitor_logs', 'feedback');
```

#### 함수 생성 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_live_visitor_count', 'get_ip_visit_stats');
```

### 5. 권한 설정 확인

#### RLS 정책 확인
```sql
-- Supabase SQL Editor에서 실행
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('visitor_logs', 'feedback');
```

### 6. 문제 지속 시 수동 해결

#### 피드백 테이블 수동 생성
```sql
CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  feedback_type TEXT DEFAULT 'other',
  title TEXT DEFAULT 'User Feedback',
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feedback DISABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT ON public.feedback TO anon, authenticated;
```

#### 방문자 테이블 수동 생성
```sql
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET,
  session_id TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.visitor_logs DISABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT ON public.visitor_logs TO anon, authenticated;
```

### 7. 브라우저 캐시 정리

문제가 지속되면 다음을 시도하세요:
1. 브라우저 개발자 도구 열기 (F12)
2. Application 탭 → Storage → Clear Storage
3. 페이지 새로고침 (Ctrl+F5)

### 8. 로그 확인

브라우저 콘솔에서 다음 메시지들을 확인하세요:
- `[AUTH_GUARD]` - 인증 관련 로그
- `[THEME]` - 테마 관련 로그  
- `[FEEDBACK]` - 피드백 관련 로그
- `[VISITOR_TRACKER]` - 방문자 추적 로그

---

이 가이드를 따라하시면 모든 문제가 해결될 것입니다! 🎯
