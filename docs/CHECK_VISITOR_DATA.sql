-- ========================================
-- 방문자 추적 데이터 실시간 확인
-- Supabase SQL Editor에서 실행하세요
-- ========================================

-- 1. 전체 통계 한 번에 확인
SELECT 
    '📊 전체 통계' as section,
    COUNT(*) as total_logs,
    COUNT(DISTINCT ip_address) as unique_ips,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    ROUND(
        CASE WHEN COUNT(*) > 0 
        THEN (COUNT(*) FILTER (WHERE ip_address IS NOT NULL)::NUMERIC / COUNT(*)) * 100 
        ELSE 0 END, 2
    ) as ip_detection_rate_percent
FROM public.visitor_logs;

-- 2. 최근 10개 방문 로그 상세 확인
SELECT 
    '🕐 최근 방문 로그' as section,
    id,
    ip_address,
    SUBSTRING(user_agent, 1, 50) as user_agent_short,
    device_type,
    browser,
    os,
    session_id,
    created_at
FROM public.visitor_logs 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. IP별 방문 횟수 (실제 데이터)
SELECT 
    '🌐 IP별 통계' as section,
    ip_address,
    COUNT(*) as visit_count,
    MAX(created_at) as last_visit,
    MIN(created_at) as first_visit,
    COUNT(DISTINCT session_id) as unique_sessions
FROM public.visitor_logs 
WHERE ip_address IS NOT NULL
GROUP BY ip_address
ORDER BY visit_count DESC;

-- 4. 오늘 방문 통계
SELECT 
    '📅 오늘 통계' as section,
    DATE(created_at) as visit_date,
    COUNT(*) as total_visits,
    COUNT(DISTINCT ip_address) as unique_visitors,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as authenticated_users
FROM public.visitor_logs 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY DATE(created_at);

-- 5. 브라우저별 통계
SELECT 
    '🌐 브라우저별 통계' as section,
    browser,
    COUNT(*) as visits,
    COUNT(DISTINCT ip_address) as unique_ips
FROM public.visitor_logs 
WHERE browser IS NOT NULL
GROUP BY browser
ORDER BY visits DESC;

-- 6. 디바이스별 통계
SELECT 
    '📱 디바이스별 통계' as section,
    device_type,
    COUNT(*) as visits,
    COUNT(DISTINCT ip_address) as unique_ips
FROM public.visitor_logs 
WHERE device_type IS NOT NULL
GROUP BY device_type
ORDER BY visits DESC;

-- 7. 방문자 추적 함수들 테스트 (안전한 방식)
SELECT '🧪 함수 테스트' as section, 'get_live_visitor_count' as function_name, 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_live_visitor_count')
        THEN public.get_live_visitor_count()::text
        ELSE '함수 없음 - MISSING_FUNCTIONS.sql 실행 필요'
    END as result
UNION ALL
SELECT '🧪 함수 테스트', 'debug_visitor_stats', 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'debug_visitor_stats')
        THEN public.debug_visitor_stats()::text
        ELSE '함수 없음 - IP_TRACKING_TEST.sql 실행 필요'
    END;

-- 7-1. 새로운 함수들 테스트 (MISSING_FUNCTIONS.sql 실행 후)
SELECT '📊 오늘 통계' as section, public.get_today_visitor_stats() as result
WHERE EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_today_visitor_stats');

SELECT '🕐 시간대별 패턴' as section, json_agg(
    json_build_object('hour', hour, 'visits', visit_count, 'unique', unique_visitors)
) as hourly_data
FROM public.get_hourly_visitor_pattern()
WHERE EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_hourly_visitor_pattern');

-- 8. 최근 1시간 방문자 활동
SELECT 
    '⏰ 최근 1시간 활동' as section,
    DATE_TRUNC('minute', created_at) as minute_slot,
    COUNT(*) as visits,
    COUNT(DISTINCT ip_address) as unique_ips
FROM public.visitor_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY minute_slot DESC
LIMIT 20;

-- 9. 당신의 IP 주소 확인 (가장 최근 방문)
SELECT 
    '🔍 당신의 최근 방문' as section,
    ip_address as your_ip,
    user_agent,
    device_type,
    browser,
    created_at as last_visit
FROM public.visitor_logs 
ORDER BY created_at DESC 
LIMIT 1;
