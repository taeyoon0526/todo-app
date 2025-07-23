-- =============================================
-- 완전한 방문자 분석 SQL 함수 모음
-- 새 Supabase 프로젝트용
-- =============================================

-- 1. 실시간 방문자 수 (최근 5분)
CREATE OR REPLACE FUNCTION get_live_visitor_count()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    live_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT session_id)
    INTO live_count
    FROM visitor_logs
    WHERE created_at >= NOW() - INTERVAL '5 minutes'
    AND session_id IS NOT NULL;
    
    RETURN COALESCE(live_count, 0);
END;
$$;

-- 2. 오늘 방문자 통계
CREATE OR REPLACE FUNCTION get_today_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    live_count INTEGER;
BEGIN
    -- 실시간 방문자 수 가져오기
    SELECT get_live_visitor_count() INTO live_count;
    
    SELECT json_build_object(
        'total_visits', COUNT(*),
        'unique_visitors', COUNT(DISTINCT session_id),
        'unique_ips', COUNT(DISTINCT ip_address),
        'authenticated_users', COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
        'live_visitors', live_count
    )
    INTO result
    FROM visitor_logs
    WHERE DATE(created_at) = CURRENT_DATE;
    
    RETURN result;
END;
$$;

-- 3. 전체 방문자 통계
CREATE OR REPLACE FUNCTION get_total_visitor_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    first_visit_date TIMESTAMP;
BEGIN
    SELECT MIN(created_at) INTO first_visit_date FROM visitor_logs;
    
    SELECT json_build_object(
        'total_visits', COUNT(*),
        'total_unique_visitors', COUNT(DISTINCT session_id),
        'total_unique_ips', COUNT(DISTINCT ip_address),
        'total_authenticated_users', COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
        'first_visit', first_visit_date,
        'collection_days', COALESCE(DATE_PART('day', NOW() - first_visit_date), 0)
    )
    INTO result
    FROM visitor_logs;
    
    RETURN result;
END;
$$;

-- 4. IP별 방문 통계
CREATE OR REPLACE FUNCTION get_ip_visit_stats(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    ip_address TEXT,
    visit_count BIGINT,
    unique_sessions BIGINT,
    first_visit TIMESTAMP,
    last_visit TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address::TEXT,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_sessions,
        MIN(vl.created_at) as first_visit,
        MAX(vl.created_at) as last_visit
    FROM visitor_logs vl
    WHERE vl.ip_address IS NOT NULL
    GROUP BY vl.ip_address
    ORDER BY visit_count DESC, last_visit DESC
    LIMIT p_limit;
END;
$$;

-- 5. 최근 방문자 (간단 버전)
CREATE OR REPLACE FUNCTION get_recent_visitors_simple(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    ip_address TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    created_at TIMESTAMP,
    url TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address::TEXT,
        vl.device_type::TEXT,
        vl.browser::TEXT,
        vl.os::TEXT,
        vl.created_at,
        vl.url::TEXT
    FROM visitor_logs vl
    ORDER BY vl.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 6. 방문자 세부 정보
CREATE OR REPLACE FUNCTION get_recent_visitors_detailed(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_resolution TEXT,
    language TEXT,
    timezone TEXT,
    referrer TEXT,
    url TEXT,
    created_at TIMESTAMP,
    user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.session_id::TEXT,
        vl.ip_address::TEXT,
        vl.user_agent::TEXT,
        vl.device_type::TEXT,
        vl.browser::TEXT,
        vl.os::TEXT,
        vl.screen_resolution::TEXT,
        vl.language::TEXT,
        vl.timezone::TEXT,
        vl.referrer::TEXT,
        vl.url::TEXT,
        vl.created_at,
        vl.user_id
    FROM visitor_logs vl
    ORDER BY vl.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 7. 시간대별 방문자 통계
CREATE OR REPLACE FUNCTION get_hourly_visitor_stats(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    hour_of_day INTEGER,
    visit_count BIGINT,
    unique_visitors BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXTRACT(HOUR FROM vl.created_at)::INTEGER as hour_of_day,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors
    FROM visitor_logs vl
    WHERE DATE(vl.created_at) = p_date
    GROUP BY EXTRACT(HOUR FROM vl.created_at)
    ORDER BY hour_of_day;
END;
$$;

-- 8. 브라우저별 통계
CREATE OR REPLACE FUNCTION get_browser_stats()
RETURNS TABLE (
    browser TEXT,
    visit_count BIGINT,
    unique_visitors BIGINT,
    percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_visits BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_visits FROM visitor_logs;
    
    RETURN QUERY
    SELECT 
        COALESCE(vl.browser, 'Unknown')::TEXT,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors,
        ROUND((COUNT(*)::NUMERIC / total_visits * 100), 2) as percentage
    FROM visitor_logs vl
    GROUP BY vl.browser
    ORDER BY visit_count DESC;
END;
$$;

-- 9. OS별 통계
CREATE OR REPLACE FUNCTION get_os_stats()
RETURNS TABLE (
    os TEXT,
    visit_count BIGINT,
    unique_visitors BIGINT,
    percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_visits BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_visits FROM visitor_logs;
    
    RETURN QUERY
    SELECT 
        COALESCE(vl.os, 'Unknown')::TEXT,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors,
        ROUND((COUNT(*)::NUMERIC / total_visits * 100), 2) as percentage
    FROM visitor_logs vl
    GROUP BY vl.os
    ORDER BY visit_count DESC;
END;
$$;

-- 10. 디바이스 타입별 통계
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE (
    device_type TEXT,
    visit_count BIGINT,
    unique_visitors BIGINT,
    percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    total_visits BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_visits FROM visitor_logs;
    
    RETURN QUERY
    SELECT 
        COALESCE(vl.device_type, 'Unknown')::TEXT,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors,
        ROUND((COUNT(*)::NUMERIC / total_visits * 100), 2) as percentage
    FROM visitor_logs vl
    GROUP BY vl.device_type
    ORDER BY visit_count DESC;
END;
$$;

-- 11. 일별 방문자 추세 (최근 30일)
CREATE OR REPLACE FUNCTION get_daily_visitor_trend(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
    visit_date DATE,
    visit_count BIGINT,
    unique_visitors BIGINT,
    unique_ips BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(vl.created_at) as visit_date,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors,
        COUNT(DISTINCT vl.ip_address)::BIGINT as unique_ips
    FROM visitor_logs vl
    WHERE vl.created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY DATE(vl.created_at)
    ORDER BY visit_date DESC;
END;
$$;

-- 12. 페이지별 방문 통계
CREATE OR REPLACE FUNCTION get_page_visit_stats()
RETURNS TABLE (
    url TEXT,
    visit_count BIGINT,
    unique_visitors BIGINT,
    bounce_rate NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(vl.url, '/')::TEXT,
        COUNT(*)::BIGINT as visit_count,
        COUNT(DISTINCT vl.session_id)::BIGINT as unique_visitors,
        ROUND(
            (COUNT(DISTINCT vl.session_id) FILTER (
                WHERE (
                    SELECT COUNT(*) 
                    FROM visitor_logs vl2 
                    WHERE vl2.session_id = vl.session_id
                ) = 1
            )::NUMERIC / COUNT(DISTINCT vl.session_id) * 100), 2
        ) as bounce_rate
    FROM visitor_logs vl
    GROUP BY vl.url
    ORDER BY visit_count DESC;
END;
$$;

-- 13. IP 지역 정보 저장 함수 (선택적)
CREATE OR REPLACE FUNCTION update_visitor_location(
    p_ip_address TEXT,
    p_country TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- 해당 IP의 모든 레코드 업데이트
    UPDATE visitor_logs 
    SET 
        country = COALESCE(p_country, country),
        region = COALESCE(p_region, region),
        city = COALESCE(p_city, city),
        latitude = COALESCE(p_latitude, latitude),
        longitude = COALESCE(p_longitude, longitude)
    WHERE ip_address = p_ip_address;
    
    RETURN FOUND;
END;
$$;

-- 14. 방문자 클린업 함수 (오래된 데이터 정리)
CREATE OR REPLACE FUNCTION cleanup_old_visitor_data(p_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM visitor_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- 15. 방문자 요약 리포트
CREATE OR REPLACE FUNCTION get_visitor_summary_report(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'period', json_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date,
            'days', (p_end_date - p_start_date + 1)
        ),
        'totals', json_build_object(
            'total_visits', COUNT(*),
            'unique_visitors', COUNT(DISTINCT session_id),
            'unique_ips', COUNT(DISTINCT ip_address),
            'authenticated_users', COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)
        ),
        'averages', json_build_object(
            'avg_visits_per_day', ROUND(COUNT(*)::NUMERIC / (p_end_date - p_start_date + 1), 2),
            'avg_unique_visitors_per_day', ROUND(COUNT(DISTINCT session_id)::NUMERIC / (p_end_date - p_start_date + 1), 2)
        ),
        'top_browser', (
            SELECT browser 
            FROM visitor_logs 
            WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
            GROUP BY browser 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        'top_os', (
            SELECT os 
            FROM visitor_logs 
            WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
            GROUP BY os 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ),
        'top_ip', (
            SELECT ip_address 
            FROM visitor_logs 
            WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date
            GROUP BY ip_address 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        )
    )
    INTO result
    FROM visitor_logs
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
    
    RETURN result;
END;
$$;

-- =============================================
-- 권한 설정 (익명 사용자가 함수 실행 가능하도록)
-- =============================================

-- 모든 함수에 대한 실행 권한 부여
GRANT EXECUTE ON FUNCTION get_live_visitor_count() TO anon;
GRANT EXECUTE ON FUNCTION get_today_visitor_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_total_visitor_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_ip_visit_stats(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_recent_visitors_simple(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_recent_visitors_detailed(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_hourly_visitor_stats(DATE) TO anon;
GRANT EXECUTE ON FUNCTION get_browser_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_os_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_device_stats() TO anon;
GRANT EXECUTE ON FUNCTION get_daily_visitor_trend(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_page_visit_stats() TO anon;
GRANT EXECUTE ON FUNCTION update_visitor_location(TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC) TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_visitor_data(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_visitor_summary_report(DATE, DATE) TO anon;

-- authenticated 사용자에게도 권한 부여
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =============================================
-- 인덱스 생성 (성능 최적화)
-- =============================================

-- 기본 인덱스들
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session_id ON visitor_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_address ON visitor_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_id ON visitor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_date ON visitor_logs(DATE(created_at));

-- 복합 인덱스들
CREATE INDEX IF NOT EXISTS idx_visitor_logs_date_session ON visitor_logs(DATE(created_at), session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_created ON visitor_logs(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_recent ON visitor_logs(created_at DESC) WHERE created_at >= NOW() - INTERVAL '7 days';

-- =============================================
-- 설치 확인 및 테스트 함수
-- =============================================

CREATE OR REPLACE FUNCTION test_all_functions()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    test_results JSON[] := ARRAY[]::JSON[];
    func_result JSON;
BEGIN
    -- 각 함수 테스트
    BEGIN
        SELECT json_build_object('function', 'get_live_visitor_count', 'status', 'success', 'result', get_live_visitor_count()) INTO func_result;
        test_results := array_append(test_results, func_result);
    EXCEPTION WHEN OTHERS THEN
        SELECT json_build_object('function', 'get_live_visitor_count', 'status', 'error', 'error', SQLERRM) INTO func_result;
        test_results := array_append(test_results, func_result);
    END;
    
    BEGIN
        SELECT json_build_object('function', 'get_today_visitor_stats', 'status', 'success', 'result', get_today_visitor_stats()) INTO func_result;
        test_results := array_append(test_results, func_result);
    EXCEPTION WHEN OTHERS THEN
        SELECT json_build_object('function', 'get_today_visitor_stats', 'status', 'error', 'error', SQLERRM) INTO func_result;
        test_results := array_append(test_results, func_result);
    END;
    
    BEGIN
        SELECT json_build_object('function', 'get_total_visitor_stats', 'status', 'success', 'result', get_total_visitor_stats()) INTO func_result;
        test_results := array_append(test_results, func_result);
    EXCEPTION WHEN OTHERS THEN
        SELECT json_build_object('function', 'get_total_visitor_stats', 'status', 'error', 'error', SQLERRM) INTO func_result;
        test_results := array_append(test_results, func_result);
    END;
    
    SELECT json_build_object(
        'test_completed_at', NOW(),
        'total_functions_tested', array_length(test_results, 1),
        'results', test_results
    ) INTO result;
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION test_all_functions() TO anon;

-- 완료 메시지
SELECT 'All visitor analytics functions have been created successfully!' as status;
