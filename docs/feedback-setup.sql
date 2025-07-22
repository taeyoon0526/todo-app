-- 피드백 시스템 테이블 생성
-- Supabase SQL Editor에서 실행하세요

-- ========================================
-- 피드백 테이블 생성
-- ========================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
  title TEXT NOT NULL,
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

-- RLS 활성화
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 정책 생성: 누구나 피드백 작성 가능
CREATE POLICY "Anyone can submit feedback" ON public.feedback
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- 정책 생성: 본인 피드백만 조회 가능
CREATE POLICY "Users can view own feedback" ON public.feedback
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);

-- 업데이트 시간 자동 갱신 트리거
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

-- 권한 설정
GRANT INSERT ON public.feedback TO anon, authenticated;
GRANT SELECT ON public.feedback TO authenticated;
