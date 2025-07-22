-- Supabase SQL Editor에서 순서대로 실행할 명령어들
-- 각 블록을 개별적으로 복사해서 실행하세요

-- ========================================
-- 1단계: feedback 테이블 생성
-- ========================================
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

-- ========================================
-- 2단계: RLS 활성화
-- ========================================
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3단계: 인덱스 생성 (성능 최적화)
-- ========================================
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);

-- ========================================
-- 4단계: 추가 인덱스
-- ========================================
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);

-- ========================================
-- 5단계: 시간 인덱스
-- ========================================
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at);

-- ========================================
-- 6단계: 피드백 삽입 정책 (모든 사용자)
-- ========================================
CREATE POLICY "Anyone can insert feedback" ON public.feedback
  FOR INSERT 
  WITH CHECK (true);

-- ========================================
-- 7단계: 조회 정책 (본인 피드백만)
-- ========================================
CREATE POLICY "Users can view own feedback" ON public.feedback
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ========================================
-- 8단계: updated_at 트리거 함수 생성
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9단계: updated_at 트리거 적용
-- ========================================
CREATE TRIGGER trigger_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 10단계: 테이블 설명 추가
-- ========================================
COMMENT ON TABLE public.feedback IS '사용자 피드백 및 버그 리포트 저장';
COMMENT ON COLUMN public.feedback.type IS '피드백 유형: bug, feature, improvement, other';
COMMENT ON COLUMN public.feedback.debug_info IS '디버그 정보 (에러 로그, 성능 정보 등)';

-- ========================================
-- 완료! 테이블 확인
-- ========================================
-- 다음 쿼리로 테이블이 정상 생성되었는지 확인하세요:
-- SELECT * FROM public.feedback LIMIT 1;
