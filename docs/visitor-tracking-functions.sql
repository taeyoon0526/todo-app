-- Supabase Edge Function을 위한 데이터베이스 함수 생성
-- SQL Editor에서 실행하세요

-- ========================================
-- IP 주소 자동 감지를 위한 함수 생성
-- ========================================

-- 1. visitor_logs 테이블에 IP 자동 입력 트리거 함수
CREATE OR REPLACE FUNCTION public.set_visitor_ip()
RETURNS TRIGGER AS $$
BEGIN
    -- IP 주소가 없는 경우 요청 헤더에서 추출
    IF NEW.ip_address IS NULL THEN
        -- Supabase의 request 컨텍스트에서 IP 주소 추출
        NEW.ip_address := inet(current_setting('request.header.x-forwarded-for', true));
        
        -- x-forwarded-for가 없으면 x-real-ip 시도
        IF NEW.ip_address IS NULL THEN
            NEW.ip_address := inet(current_setting('request.header.x-real-ip', true));
        END IF;
        
        -- 그래도 없으면 기본 IP로 설정
        IF NEW.ip_address IS NULL THEN
            NEW.ip_address := inet('0.0.0.0');
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_visitor_ip ON public.visitor_logs;
CREATE TRIGGER trigger_set_visitor_ip
    BEFORE INSERT ON public.visitor_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_visitor_ip();

-- ========================================
-- 방문자 추적을 위한 저장 프로시저
-- ========================================

CREATE OR REPLACE FUNCTION public.track_visitor(
    p_user_agent TEXT DEFAULT NULL,
    p_referer TEXT DEFAULT NULL,
    p_url TEXT DEFAULT NULL,
    p_screen_resolution TEXT DEFAULT NULL,
    p_language TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_device_type TEXT DEFAULT NULL,
    p_browser TEXT DEFAULT NULL,
    p_os TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_is_first_visit BOOLEAN DEFAULT false,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_ip_address INET;
    v_result JSON;
    v_log_id BIGINT;
BEGIN
    -- 클라이언트 IP 주소 추출
    BEGIN
        v_ip_address := inet(current_setting('request.header.cf-connecting-ip', true));
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            v_ip_address := inet(current_setting('request.header.x-forwarded-for', true));
        EXCEPTION WHEN OTHERS THEN
            BEGIN
                v_ip_address := inet(current_setting('request.header.x-real-ip', true));
            EXCEPTION WHEN OTHERS THEN
                v_ip_address := inet('0.0.0.0');
            END;
        END;
    END;
    
    -- 방문 로그 삽입
    INSERT INTO public.visitor_logs (
        ip_address,
        user_id,
        user_agent,
        referer,
        url,
        screen_resolution,
        language,
        timezone,
        device_type,
        browser,
        os,
        session_id,
        is_first_visit
    ) VALUES (
        v_ip_address,
        COALESCE(p_user_id, auth.uid()),
        p_user_agent,
        p_referer,
        p_url,
        p_screen_resolution,
        p_language,
        p_timezone,
        p_device_type,
        p_browser,
        p_os,
        p_session_id,
        p_is_first_visit
    ) RETURNING id INTO v_log_id;
    
    -- 결과 반환
    v_result := json_build_object(
        'success', true,
        'log_id', v_log_id,
        'ip_address', host(v_ip_address),
        'message', 'Visitor tracked successfully'
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to track visitor'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 방문 통계 조회 함수들
-- ========================================

-- 실시간 방문자 수 조회
CREATE OR REPLACE FUNCTION public.get_live_visitor_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT session_id)
        FROM public.visitor_logs
        WHERE created_at > NOW() - INTERVAL '30 minutes'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IP별 방문 횟수 조회
CREATE OR REPLACE FUNCTION public.get_ip_visit_stats(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
    ip_address INET,
    visit_count BIGINT,
    last_visit TIMESTAMPTZ,
    first_visit TIMESTAMPTZ,
    countries TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vl.ip_address,
        COUNT(*) as visit_count,
        MAX(vl.created_at) as last_visit,
        MIN(vl.created_at) as first_visit,
        ARRAY_AGG(DISTINCT vl.country) FILTER (WHERE vl.country IS NOT NULL) as countries
    FROM public.visitor_logs vl
    GROUP BY vl.ip_address
    ORDER BY visit_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 권한 설정
GRANT EXECUTE ON FUNCTION public.track_visitor TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_live_visitor_count TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_ip_visit_stats TO authenticated;
