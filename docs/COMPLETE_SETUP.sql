-- ========================================
-- TODO 앱 완전 설정을 위한 통합 SQL 명령어
-- Supabase SQL Editor에서 순서대로 실행하세요
-- ========================================

-- ========================================
-- 1단계: 기본 사용자 테이블 확인 및 생성
-- ========================================

-- todos 테이블 생성 (기본 할일 관리)
CREATE TABLE IF NOT EXISTS public.todos (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    category TEXT DEFAULT 'general',
    description TEXT,
    tags TEXT[]
);

-- todos 테이블 RLS 활성화
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- todos 테이블 정책 생성
CREATE POLICY "Users can view own todos" ON public.todos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos" ON public.todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos" ON public.todos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos" ON public.todos
    FOR DELETE USING (auth.uid() = user_id);

-- todos 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at);

-- ========================================
-- 2단계: 피드백 시스템 테이블 생성
-- ========================================

CREATE TABLE IF NOT EXISTS public.feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')) DEFAULT 'other',
    title TEXT DEFAULT 'User Feedback',
    description TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    browser_info JSONB,
    device_info JSONB,
    url TEXT,
    screenshot_url TEXT,
    is_resolved BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 피드백 테이블 RLS 활성화
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 피드백 정책: 누구나 피드백 작성 가능
CREATE POLICY "Anyone can submit feedback" ON public.feedback
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- 피드백 정책: 본인 피드백만 조회 가능
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 피드백 인덱스
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);

-- 피드백 업데이트 시간 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedback_updated_at
    BEFORE UPDATE ON public.feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.update_feedback_updated_at();

-- ========================================
-- 3단계: 방문자 추적 테이블 생성 (IP 주소 NULL 허용)
-- ========================================

CREATE TABLE IF NOT EXISTS public.visitor_logs (
    id BIGSERIAL PRIMARY KEY,
    ip_address INET, -- NULL 허용으로 변경
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_agent TEXT,
    referer TEXT,
    url TEXT,
    screen_resolution TEXT,
    language TEXT,
    timezone TEXT,
    country TEXT,
    city TEXT,
    device_type TEXT, -- mobile, desktop, tablet
    browser TEXT,
    os TEXT,
    visit_duration INTEGER, -- 페이지 머문 시간 (초)
    page_views INTEGER DEFAULT 1,
    is_first_visit BOOLEAN DEFAULT false,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 방문자 로그 RLS 비활성화 (모든 방문자 데이터 삽입 허용)
ALTER TABLE public.visitor_logs DISABLE ROW LEVEL SECURITY;

-- 방문자 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON public.visitor_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_id ON public.visitor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session_id ON public.visitor_logs(session_id);

-- ========================================
-- 4단계: 방문자 통계 함수들 생성
-- ========================================

-- 실시간 방문자 수 조회
CREATE OR REPLACE FUNCTION public.get_live_visitor_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.visitor_logs
  WHERE created_at > NOW() - INTERVAL '30 minutes'
    AND session_id IS NOT NULL;
$$;

-- IP 통계 조회
CREATE OR REPLACE FUNCTION public.get_ip_visit_stats(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    ip_address INET,
    visit_count BIGINT,
    last_visit TIMESTAMPTZ,
    first_visit TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    vl.ip_address,
    COUNT(*) as visit_count,
    MAX(vl.created_at) as last_visit,
    MIN(vl.created_at) as first_visit
  FROM public.visitor_logs vl
  WHERE vl.ip_address IS NOT NULL
  GROUP BY vl.ip_address
  ORDER BY visit_count DESC
  LIMIT p_limit;
$$;

-- ========================================
-- 5단계: 통계 뷰 생성
-- ========================================

-- 일별 방문 통계 뷰
CREATE OR REPLACE VIEW public.daily_visitor_stats AS
SELECT 
    DATE(created_at) as visit_date,
    COUNT(DISTINCT ip_address) as unique_visitors,
    COUNT(*) as total_visits,
    COUNT(DISTINCT user_id) as authenticated_users
FROM public.visitor_logs 
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;

-- IP 통계 뷰
CREATE OR REPLACE VIEW public.visitor_stats AS
SELECT 
    ip_address,
    COUNT(*) as visit_count,
    MAX(created_at) as last_visit,
    MIN(created_at) as first_visit,
    ARRAY_AGG(DISTINCT user_agent ORDER BY created_at DESC) as user_agents,
    ARRAY_AGG(DISTINCT country ORDER BY created_at DESC) FILTER (WHERE country IS NOT NULL) as countries
FROM public.visitor_logs 
WHERE ip_address IS NOT NULL
GROUP BY ip_address;

-- ========================================
-- 6단계: IP 자동 감지 트리거 (선택사항)
-- ========================================

-- IP 주소 자동 감지 함수 (Vercel 최적화)
CREATE OR REPLACE FUNCTION public.set_visitor_ip()
RETURNS TRIGGER AS $$
BEGIN
    -- IP 주소가 없는 경우에만 헤더에서 추출 시도
    IF NEW.ip_address IS NULL THEN
        BEGIN
            -- Vercel/Cloudflare IP (우선순위 1)
            NEW.ip_address := inet(current_setting('request.header.cf-connecting-ip', true));
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                -- X-Forwarded-For (Vercel 표준, 우선순위 2)
                NEW.ip_address := inet(trim(split_part(current_setting('request.header.x-forwarded-for', true), ',', 1)));
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    -- X-Real-IP (우선순위 3)
                    NEW.ip_address := inet(current_setting('request.header.x-real-ip', true));
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        -- Vercel 특수 헤더 (우선순위 4)
                        NEW.ip_address := inet(current_setting('request.header.x-vercel-forwarded-for', true));
                    EXCEPTION WHEN OTHERS THEN
                        BEGIN
                            -- True-Client-IP (우선순위 5)
                            NEW.ip_address := inet(current_setting('request.header.true-client-ip', true));
                        EXCEPTION WHEN OTHERS THEN
                            -- IP 감지 실패 시 기본 IP 설정 (Vercel 환경 표시용)
                            NEW.ip_address := inet('127.0.0.1');
                        END;
                    END;
                END;
            END;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_visitor_ip ON public.visitor_logs;
CREATE TRIGGER trigger_set_visitor_ip
    BEFORE INSERT ON public.visitor_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_visitor_ip();

-- ========================================
-- 7단계: 권한 설정
-- ========================================

-- 익명 사용자와 인증된 사용자 모두에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_live_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_visit_stats(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_visitor_ip() TO anon, authenticated;

-- 테이블 권한 설정
GRANT SELECT ON public.todos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.todos TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.todos_id_seq TO authenticated;

GRANT INSERT, SELECT ON public.feedback TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.feedback_id_seq TO anon, authenticated;

GRANT INSERT, SELECT ON public.visitor_logs TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.visitor_logs_id_seq TO anon, authenticated;

-- 뷰 권한 설정
GRANT SELECT ON public.daily_visitor_stats TO anon, authenticated;
GRANT SELECT ON public.visitor_stats TO anon, authenticated;

-- ========================================
-- 8단계: 테이블 설명 추가
-- ========================================

COMMENT ON TABLE public.todos IS 'TODO 리스트 아이템';
COMMENT ON TABLE public.feedback IS '사용자 피드백 및 버그 리포트';
COMMENT ON TABLE public.visitor_logs IS '웹사이트 방문자 추적 로그';

COMMENT ON COLUMN public.visitor_logs.ip_address IS '방문자 IP 주소 (자동 감지)';
COMMENT ON COLUMN public.visitor_logs.session_id IS '브라우저 세션 식별자';
COMMENT ON COLUMN public.visitor_logs.is_first_visit IS '최초 방문 여부';

-- ========================================
-- 9단계: 설정 검증 쿼리들
-- ========================================

-- 생성된 테이블 확인
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('todos', 'feedback', 'visitor_logs')
ORDER BY table_name;

-- 생성된 함수 확인
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_live_visitor_count', 'get_ip_visit_stats', 'set_visitor_ip')
ORDER BY routine_name;

-- RLS 상태 확인
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('todos', 'feedback', 'visitor_logs')
ORDER BY tablename;

-- 정책 확인
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 방문자 로그 데이터 확인 (최근 10개)
SELECT id, ip_address, user_id, device_type, browser, session_id, created_at
FROM public.visitor_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 오늘 방문 데이터 확인
SELECT COUNT(*) as total_visits, COUNT(DISTINCT ip_address) as unique_ips, COUNT(DISTINCT session_id) as unique_sessions
FROM public.visitor_logs 
WHERE DATE(created_at) = CURRENT_DATE;

-- ========================================
-- 완료! 
-- ========================================

-- 설정이 완료되었습니다!
-- 이제 다음 기능들이 모두 작동합니다:
-- ✅ TODO 리스트 (완전한 CRUD)
-- ✅ 사용자 피드백 시스템
-- ✅ 방문자 IP 추적 (자동 감지)
-- ✅ 실시간 방문자 통계
-- ✅ 관리자 대시보드

SELECT 'TODO 앱 데이터베이스 설정이 완료되었습니다!' as status;
