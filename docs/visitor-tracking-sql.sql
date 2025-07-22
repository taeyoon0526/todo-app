-- 웹사이트 방문자 IP 추적을 위한 테이블 생성
-- Supabase SQL Editor에서 순서대로 실행하세요

-- ========================================
-- 1단계: visitor_logs 테이블 생성
-- ========================================
CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id BIGSERIAL PRIMARY KEY,
  ip_address INET NOT NULL,
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

-- ========================================
-- 2단계: RLS 비활성화 (모든 방문자 데이터 삽입 허용)
-- ========================================
ALTER TABLE public.visitor_logs DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 3단계: 인덱스 생성 (성능 최적화)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip ON public.visitor_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_id ON public.visitor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON public.visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session_id ON public.visitor_logs(session_id);

-- ========================================
-- 4단계: 테이블 설명 추가
-- ========================================
COMMENT ON TABLE public.visitor_logs IS '웹사이트 방문자 추적 및 분석 데이터';
COMMENT ON COLUMN public.visitor_logs.ip_address IS '방문자 IP 주소';
COMMENT ON COLUMN public.visitor_logs.session_id IS '브라우저 세션 식별자';
COMMENT ON COLUMN public.visitor_logs.is_first_visit IS '최초 방문 여부';
COMMENT ON COLUMN public.visitor_logs.visit_duration IS '페이지 머문 시간 (초)';

-- ========================================
-- 5단계: IP 통계 조회용 뷰 생성
-- ========================================
CREATE OR REPLACE VIEW public.visitor_stats AS
SELECT 
  ip_address,
  COUNT(*) as visit_count,
  MAX(created_at) as last_visit,
  MIN(created_at) as first_visit,
  ARRAY_AGG(DISTINCT user_agent) as user_agents,
  ARRAY_AGG(DISTINCT country) as countries
FROM public.visitor_logs 
GROUP BY ip_address;

-- ========================================
-- 6단계: 일일 방문 통계 뷰
-- ========================================
CREATE OR REPLACE VIEW public.daily_visitor_stats AS
SELECT 
  DATE(created_at) as visit_date,
  COUNT(DISTINCT ip_address) as unique_visitors,
  COUNT(*) as total_visits,
  COUNT(DISTINCT user_id) as authenticated_users
FROM public.visitor_logs 
GROUP BY DATE(created_at)
ORDER BY visit_date DESC;
