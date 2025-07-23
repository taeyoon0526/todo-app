-- 방문자 추적 필수 함수들 (단순화된 버전)
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- ========================================
-- 기존 함수들 삭제 (오류 방지)
-- ========================================
DROP FUNCTION IF EXISTS public.get_live_visitor_count();
DROP FUNCTION IF EXISTS public.get_today_visitor_stats();
DROP FUNCTION IF EXISTS public.get_ip_visit_stats(INTEGER);
DROP FUNCTION IF EXISTS public.get_visitor_logs_summary(INTEGER);
DROP FUNCTION IF EXISTS public.get_hourly_visitor_pattern();
DROP FUNCTION IF EXISTS public.get_visitor_dashboard_data();

-- ========================================
-- 1. 실시간 방문자 수 (최근 5분)
-- ========================================
CREATE FUNCTION public.get_live_visitor_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    live_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT session_id) INTO live_count
    FROM public.visitor_logs 
    WHERE created_at >= NOW() - INTERVAL '5 minutes'
    AND session_id IS NOT NULL;
    
    RETURN COALESCE(live_count, 0);
END;
$$;

-- ========================================
-- 2. IP별 방문 통계
-- ========================================
CREATE FUNCTION public.get_ip_visit_stats(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    ip_address INET,
    visit_count BIGINT,
    last_visit TIMESTAMPTZ,
    first_visit TIMESTAMPTZ,
    unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address,
        COUNT(*) as visit_count,
        MAX(vl.created_at) as last_visit,
        MIN(vl.created_at) as first_visit,
        COUNT(DISTINCT vl.session_id) as unique_sessions
    FROM public.visitor_logs vl
    WHERE vl.ip_address IS NOT NULL
    GROUP BY vl.ip_address
    ORDER BY COUNT(*) DESC
    LIMIT p_limit;
END;
$$;

-- ========================================
-- 3. 오늘 방문자 통계
-- ========================================
CREATE FUNCTION public.get_today_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    today_visits INTEGER;
    unique_visitors INTEGER;
    unique_ips INTEGER;
    authenticated_users INTEGER;
    live_visitors INTEGER;
BEGIN
    -- 오늘 통계 계산
    SELECT 
        COUNT(*),
        COUNT(DISTINCT session_id),
        COUNT(DISTINCT ip_address),
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO today_visits, unique_visitors, unique_ips, authenticated_users
    FROM public.visitor_logs 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- 실시간 방문자 수
    SELECT public.get_live_visitor_count() INTO live_visitors;
    
    -- JSON 결과 생성
    result := json_build_object(
        'date', CURRENT_DATE,
        'total_visits', COALESCE(today_visits, 0),
        'unique_visitors', COALESCE(unique_visitors, 0),
        'unique_ips', COALESCE(unique_ips, 0),
        'authenticated_users', COALESCE(authenticated_users, 0),
        'live_visitors', COALESCE(live_visitors, 0)
    );
    
    RETURN result;
END;
$$;

-- ========================================
-- 4. 최근 방문자 조회 (개선)
-- ========================================
CREATE FUNCTION public.get_recent_visitors_simple(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    id BIGINT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    created_at TIMESTAMPTZ,
    url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.id,
        vl.ip_address,
        vl.device_type,
        vl.browser,
        vl.os,
        vl.created_at,
        vl.url
    FROM public.visitor_logs vl
    ORDER BY vl.created_at DESC
    LIMIT p_limit;
END;
$$;

-- ========================================
-- 5. 전체 통계 요약
-- ========================================
CREATE FUNCTION public.get_total_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    total_visits INTEGER;
    total_unique_visitors INTEGER;
    total_unique_ips INTEGER;
    first_visit TIMESTAMPTZ;
    last_visit TIMESTAMPTZ;
BEGIN
    -- 전체 통계 계산
    SELECT 
        COUNT(*),
        COUNT(DISTINCT session_id),
        COUNT(DISTINCT ip_address),
        MIN(created_at),
        MAX(created_at)
    INTO total_visits, total_unique_visitors, total_unique_ips, first_visit, last_visit
    FROM public.visitor_logs;
    
    -- JSON 결과 생성
    result := json_build_object(
        'total_visits', COALESCE(total_visits, 0),
        'total_unique_visitors', COALESCE(total_unique_visitors, 0),
        'total_unique_ips', COALESCE(total_unique_ips, 0),
        'first_visit', first_visit,
        'last_visit', last_visit,
        'data_collected_since', first_visit
    );
    
    RETURN result;
END;
$$;

-- ========================================
-- 권한 부여
-- ========================================
GRANT EXECUTE ON FUNCTION public.get_live_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_visit_stats(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_visitor_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_visitors_simple(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_visitor_stats() TO anon, authenticated;

-- ========================================
-- 테스트 실행
-- ========================================
SELECT 'live_visitors' as test, public.get_live_visitor_count() as result;
SELECT 'today_stats' as test, public.get_today_visitor_stats() as result;
SELECT 'total_stats' as test, public.get_total_visitor_stats() as result;

-- IP 통계 테스트
SELECT 'top_ips' as test, COUNT(*) as function_result_count 
FROM public.get_ip_visit_stats(5);

-- 최근 방문자 테스트
SELECT 'recent_visitors' as test, COUNT(*) as function_result_count 
FROM public.get_recent_visitors_simple(5);

-- 성공 메시지
SELECT '🎉 모든 함수가 성공적으로 생성되었습니다!' as status;
