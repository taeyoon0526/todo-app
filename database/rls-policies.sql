-- RLS (Row Level Security) 정책 설정
-- Supabase 대시보드의 SQL 에디터에서 실행

-- 1. todos 테이블에 RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 2. 사용자 본인의 데이터만 조회 가능하도록 정책 설정
CREATE POLICY "Users can view own todos" ON todos
    FOR SELECT USING (auth.uid() = user_id);

-- 3. 사용자 본인의 데이터만 생성 가능하도록 정책 설정
CREATE POLICY "Users can insert own todos" ON todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 사용자 본인의 데이터만 수정 가능하도록 정책 설정
CREATE POLICY "Users can update own todos" ON todos
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. 사용자 본인의 데이터만 삭제 가능하도록 정책 설정
CREATE POLICY "Users can delete own todos" ON todos
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 정책 확인 쿼리
-- SELECT * FROM pg_policies WHERE tablename = 'todos';

-- 7. RLS 상태 확인 쿼리
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'todos';
