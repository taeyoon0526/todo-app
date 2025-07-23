-- 누락된 방문자 추적 함수들 추가
-- COMPLETE_SETUP.sql과 IP_TRACKING_TEST.sql 실행 후 이것도 실행하세요

-- ========================================
-- 실시간 방문자 수 조회 함수
-- ========================================

-- 실시간 방문자 수 (최근 5분 내 활동)
CREATE OR REPLACE FUNCTION public.get_live_visitor_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT session_id)
        FROM public.visitor_logs 
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
        AND session_id IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 오늘의 방문자 통계
CREATE OR REPLACE FUNCTION public.get_today_visitor_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    today_visits INTEGER;
    unique_visitors INTEGER;
    unique_ips INTEGER;
    authenticated_users INTEGER;
BEGIN
    -- 오늘의 통계 수집
    SELECT 
        COUNT(*),
        COUNT(DISTINCT session_id),
        COUNT(DISTINCT ip_address),
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
    INTO today_visits, unique_visitors, unique_ips, authenticated_users
    FROM public.visitor_logs 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    result := json_build_object(
        'date', CURRENT_DATE,
        'total_visits', today_visits,
        'unique_visitors', unique_visitors,
        'unique_ips', unique_ips,
        'authenticated_users', authenticated_users,
        'live_visitors', public.get_live_visitor_count()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 시간대별 방문 패턴 (오늘)
CREATE OR REPLACE FUNCTION public.get_hourly_visitor_pattern()
RETURNS TABLE(
    hour INTEGER,
    visit_count BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM created_at)::INTEGER as hour,
        COUNT(*) as visit_count,
        COUNT(DISTINCT session_id) as unique_visitors
    FROM public.visitor_logs 
    WHERE DATE(created_at) = CURRENT_DATE
    GROUP BY EXTRACT(HOUR FROM created_at)
    ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 방문자 대시보드용 통합 데이터
CREATE OR REPLACE FUNCTION public.get_visitor_dashboard_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
    stats JSON;
    recent_visitors JSON;
    hourly_pattern JSON;
BEGIN
    -- 기본 통계
    SELECT public.get_today_visitor_stats() INTO stats;
    
    -- 최근 방문자 (최근 10명)
    SELECT json_agg(
        json_build_object(
            'ip_address', ip_address::text,
            'device_type', device_type,
            'browser', browser,
            'os', os,
            'created_at', created_at,
            'url', url
        )
    ) INTO recent_visitors
    FROM (
        SELECT DISTINCT ON (session_id) 
            ip_address, device_type, browser, os, created_at, url
        FROM public.visitor_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY session_id, created_at DESC
        LIMIT 10
    ) recent;
    
    -- 시간대별 패턴
    SELECT json_agg(
        json_build_object(
            'hour', hour,
            'visit_count', visit_count,
            'unique_visitors', unique_visitors
        )
    ) INTO hourly_pattern
    FROM public.get_hourly_visitor_pattern();
    
    result := json_build_object(
        'stats', stats,
        'recent_visitors', recent_visitors,
        'hourly_pattern', hourly_pattern,
        'generated_at', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 방문자 로그 요약 (관리용) - 컬럼명 충돌 해결
CREATE OR REPLACE FUNCTION public.get_visitor_logs_summary(p_days INTEGER DEFAULT 7)
RETURNS TABLE(
    date DATE,
    total_visits BIGINT,
    unique_visitors BIGINT,
    unique_ips BIGINT,
    authenticated_users BIGINT,
    top_browser TEXT,
    top_device TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH daily_stats AS (
        SELECT 
            DATE(vl.created_at) as visit_date,
            COUNT(*) as daily_total_visits,
            COUNT(DISTINCT vl.session_id) as daily_unique_visitors,
            COUNT(DISTINCT vl.ip_address) as daily_unique_ips,
            COUNT(DISTINCT vl.user_id) FILTER (WHERE vl.user_id IS NOT NULL) as daily_authenticated_users,
            MODE() WITHIN GROUP (ORDER BY vl.browser) as daily_top_browser,
            MODE() WITHIN GROUP (ORDER BY vl.device_type) as daily_top_device
        FROM public.visitor_logs vl
        WHERE vl.created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
        GROUP BY DATE(vl.created_at)
    )
    SELECT 
        ds.visit_date as date,
        ds.daily_total_visits as total_visits,
        ds.daily_unique_visitors as unique_visitors,
        ds.daily_unique_ips as unique_ips,
        ds.daily_authenticated_users as authenticated_users,
        ds.daily_top_browser as top_browser,
        ds.daily_top_device as top_device
    FROM daily_stats ds
    ORDER BY ds.visit_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.get_live_visitor_count() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_visitor_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_hourly_visitor_pattern() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visitor_dashboard_data() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_visitor_logs_summary(INTEGER) TO anon, authenticated;

-- ========================================
-- 추가 누락된 함수들 (방문자 대시보드용)
-- ========================================

-- IP별 방문 통계 (대시보드에서 사용)
CREATE OR REPLACE FUNCTION public.get_ip_visit_stats(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    ip_address INET,
    visit_count BIGINT,
    last_visit TIMESTAMPTZ,
    first_visit TIMESTAMPTZ,
    unique_sessions BIGINT,
    user_agents TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address,
        COUNT(*) as visit_count,
        MAX(vl.created_at) as last_visit,
        MIN(vl.created_at) as first_visit,
        COUNT(DISTINCT vl.session_id) as unique_sessions,
        ARRAY_AGG(DISTINCT vl.user_agent) as user_agents
    FROM public.visitor_logs vl
    WHERE vl.ip_address IS NOT NULL
    GROUP BY vl.ip_address
    ORDER BY visit_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 최근 방문자 상세 정보
CREATE OR REPLACE FUNCTION public.get_recent_visitors_detailed(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    id BIGINT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    language TEXT,
    timezone TEXT,
    url TEXT,
    session_id TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.id,
        vl.ip_address,
        vl.user_agent,
        vl.device_type,
        vl.browser,
        vl.os,
        vl.screen_resolution,
        vl.language,
        vl.timezone,
        vl.url,
        vl.session_id,
        vl.created_at
    FROM public.visitor_logs vl
    ORDER BY vl.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 일별 방문 통계 (차트용)
CREATE OR REPLACE FUNCTION public.get_daily_visit_stats(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
    visit_date DATE,
    unique_visitors BIGINT,
    total_visits BIGINT,
    authenticated_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as visit_date,
        COUNT(DISTINCT session_id) as unique_visitors,
        COUNT(*) as total_visits,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as authenticated_users
    FROM public.visitor_logs 
    WHERE created_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY visit_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 추가 함수들 권한 부여
GRANT EXECUTE ON FUNCTION public.get_ip_visit_stats(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_visitors_detailed(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_visit_stats(INTEGER) TO anon, authenticated;

-- ========================================
-- 테스트 실행
-- ========================================

-- 함수 테스트
SELECT 'get_live_visitor_count' as function_name, public.get_live_visitor_count() as result;
SELECT 'get_today_visitor_stats' as function_name, public.get_today_visitor_stats() as result;
SELECT 'get_visitor_dashboard_data' as function_name, public.get_visitor_dashboard_data() as result;

-- 방문자 로그 요약 (최근 3일)
SELECT * FROM public.get_visitor_logs_summary(3);
