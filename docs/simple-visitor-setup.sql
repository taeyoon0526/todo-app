-- 간단한 방문자 추적 시스템 (단계별 설치)
-- Supabase SQL Editor에서 하나씩 실행하세요

-- ========================================
-- 1단계: 기본 테이블 생성
-- ========================================

-- 방문자 로그 테이블
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  url TEXT,
  device_type TEXT,
  browser TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 비활성화 (모든 방문자 데이터 삽입 허용)
ALTER TABLE public.visitor_logs DISABLE ROW LEVEL SECURITY;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON public.visitor_logs(ip_address);

-- ========================================
-- 2단계: 기본 함수들 생성
-- ========================================

-- 실시간 방문자 수 (간단 버전)
CREATE OR REPLACE FUNCTION public.get_live_visitor_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT session_id)::INTEGER
  FROM public.visitor_logs
  WHERE created_at > NOW() - INTERVAL '30 minutes';
$$;

-- IP 통계 조회 (간단 버전)
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

-- 일별 통계 뷰
CREATE OR REPLACE VIEW public.daily_visitor_stats AS
SELECT 
  DATE(created_at) as visit_date,
  COUNT(DISTINCT ip_address) as unique_visitors,
  COUNT(*) as total_visits,
  COUNT(DISTINCT user_id) as authenticated_users
FROM public.visitor_logs 
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;

-- ========================================
-- 3단계: 권한 설정
-- ========================================

-- 익명 사용자와 인증된 사용자 모두에게 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_live_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_visit_stats(INTEGER) TO anon, authenticated;

-- 테이블 읽기 권한
GRANT SELECT ON public.visitor_logs TO anon, authenticated;
GRANT SELECT ON public.daily_visitor_stats TO anon, authenticated;

-- 테이블 삽입 권한 (방문 추적용)
GRANT INSERT ON public.visitor_logs TO anon, authenticated;
