-- Vercel 환경에서 IP 추적 테스트를 위한 추가 SQL
-- 위의 COMPLETE_SETUP.sql 실행 후 이것도 실행하세요

-- ========================================
-- IP 추적 테스트 및 디버깅용 함수들
-- ========================================

-- 1. 강제 IP 삽입 테스트 함수
CREATE OR REPLACE FUNCTION public.test_insert_visitor_log(
    test_ip TEXT DEFAULT '203.252.33.16', -- 테스트용 한국 IP
    test_session TEXT DEFAULT 'test_session_001'
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    log_id BIGINT;
BEGIN
    -- 테스트 방문자 로그 삽입
    INSERT INTO public.visitor_logs (
        ip_address,
        user_agent,
        url,
        device_type,
        browser,
        session_id,
        is_first_visit
    ) VALUES (
        inet(test_ip),
        'Mozilla/5.0 (Test Browser) Vercel/1.0',
        'https://todoapp7286.vercel.app/',
        'desktop',
        'Test Browser',
        test_session,
        true
    ) RETURNING id INTO log_id;
    
    result := json_build_object(
        'success', true,
        'log_id', log_id,
        'test_ip', test_ip,
        'message', 'Test visitor log inserted successfully'
    );
    
    RETURN result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to insert test visitor log'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. IP 통계 확인 함수 (디버깅용)
CREATE OR REPLACE FUNCTION public.debug_visitor_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    total_logs INTEGER;
    logs_with_ip INTEGER;
    logs_without_ip INTEGER;
    unique_ips INTEGER;
    unique_sessions INTEGER;
BEGIN
    -- 통계 수집
    SELECT COUNT(*) INTO total_logs FROM public.visitor_logs;
    SELECT COUNT(*) INTO logs_with_ip FROM public.visitor_logs WHERE ip_address IS NOT NULL;
    SELECT COUNT(*) INTO logs_without_ip FROM public.visitor_logs WHERE ip_address IS NULL;
    SELECT COUNT(DISTINCT ip_address) INTO unique_ips FROM public.visitor_logs WHERE ip_address IS NOT NULL;
    SELECT COUNT(DISTINCT session_id) INTO unique_sessions FROM public.visitor_logs WHERE session_id IS NOT NULL;
    
    result := json_build_object(
        'total_logs', total_logs,
        'logs_with_ip', logs_with_ip,
        'logs_without_ip', logs_without_ip,
        'unique_ips', unique_ips,
        'unique_sessions', unique_sessions,
        'ip_detection_rate', CASE WHEN total_logs > 0 THEN ROUND((logs_with_ip::NUMERIC / total_logs) * 100, 2) ELSE 0 END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 최근 방문자 로그 조회 함수
CREATE OR REPLACE FUNCTION public.get_recent_visitor_logs(p_limit INTEGER DEFAULT 5)
RETURNS TABLE(
    id BIGINT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
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
        vl.session_id,
        vl.created_at
    FROM public.visitor_logs vl
    ORDER BY vl.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. IP별 방문 빈도 조회 (실제 데이터)
CREATE OR REPLACE FUNCTION public.get_real_ip_stats()
RETURNS TABLE(
    ip_address INET,
    visit_count BIGINT,
    last_visit TIMESTAMPTZ,
    user_agents TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address,
        COUNT(*) as visit_count,
        MAX(vl.created_at) as last_visit,
        ARRAY_AGG(DISTINCT vl.user_agent) as user_agents
    FROM public.visitor_logs vl
    WHERE vl.ip_address IS NOT NULL
    GROUP BY vl.ip_address
    ORDER BY visit_count DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 부여
GRANT EXECUTE ON FUNCTION public.test_insert_visitor_log(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.debug_visitor_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_visitor_logs(INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_real_ip_stats() TO anon, authenticated;

-- ========================================
-- 테스트 실행 및 확인
-- ========================================

-- 테스트 데이터 삽입
SELECT public.test_insert_visitor_log('203.252.33.16', 'test_session_korean');
SELECT public.test_insert_visitor_log('8.8.8.8', 'test_session_google');
SELECT public.test_insert_visitor_log('1.1.1.1', 'test_session_cloudflare');

-- 통계 확인
SELECT public.debug_visitor_stats();

-- 최근 로그 확인
SELECT * FROM public.get_recent_visitor_logs(10);

-- IP 통계 확인
SELECT * FROM public.get_real_ip_stats();
