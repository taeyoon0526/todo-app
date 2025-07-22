-- Supabase에서 실행할 SQL 쿼리
-- feedback 테이블 생성

-- 1. feedback 테이블 생성
CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'other')),
  message TEXT NOT NULL,
  url TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  language TEXT,
  timezone TEXT,
  debug_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS (Row Level Security) 정책 설정
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

-- 4. RLS 정책 생성
-- 모든 사용자가 피드백을 삽입할 수 있음 (익명 포함)
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT 
  WITH CHECK (true);

-- 사용자는 자신의 피드백만 조회 가능
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- 관리자용 정책 (필요시 추가)
-- CREATE POLICY "Admin can view all feedback" ON public.feedback
--   FOR ALL 
--   USING (auth.jwt() ->> 'role' = 'admin');

-- 5. updated_at 자동 업데이트 트리거 생성
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 6. 테이블 설명 추가
COMMENT ON TABLE public.feedback IS '사용자 피드백 및 버그 리포트 저장';
COMMENT ON COLUMN public.feedback.type IS '피드백 유형: bug, feature, improvement, other';
COMMENT ON COLUMN public.feedback.debug_info IS '디버그 정보 (에러 로그, 성능 정보 등)';
