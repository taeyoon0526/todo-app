-- =============================================
-- 방문자 로그 테이블 생성 (새 Supabase 프로젝트용)
-- =============================================

-- 1. visitor_logs 테이블 생성
CREATE TABLE IF NOT EXISTS visitor_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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
    country TEXT,
    region TEXT,
    city TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS (Row Level Security) 설정
ALTER TABLE visitor_logs ENABLE ROW LEVEL SECURITY;

-- 3. 정책 생성 (모든 사용자가 읽기/쓰기 가능)
CREATE POLICY "Public can read visitor_logs" ON visitor_logs
    FOR SELECT USING (true);

CREATE POLICY "Public can insert visitor_logs" ON visitor_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update visitor_logs" ON visitor_logs
    FOR UPDATE USING (true);

-- 4. 기본 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_visitor_logs_created_at ON visitor_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_session_id ON visitor_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_address ON visitor_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_user_id ON visitor_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_date ON visitor_logs(DATE(created_at));

-- 5. 복합 인덱스들
CREATE INDEX IF NOT EXISTS idx_visitor_logs_date_session ON visitor_logs(DATE(created_at), session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_ip_created ON visitor_logs(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_visitor_logs_recent ON visitor_logs(created_at DESC) WHERE created_at >= NOW() - INTERVAL '7 days';

-- 완료 메시지
SELECT 'visitor_logs table created successfully!' as status;
