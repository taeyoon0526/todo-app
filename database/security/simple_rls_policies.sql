-- ============================================================================
-- TODO-LIST Application - Simple RLS Policies
-- 
-- 기본 RLS 정책 (테이블 구조에 맞춤)
-- T-034 구현을 위한 간단한 Supabase SQL 스크립트
-- 
-- Copyright (c) 2025 taeyoon0526
-- ============================================================================

-- 1. 기존 RLS 정책 확인 및 삭제
DROP POLICY IF EXISTS "Users can view their own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;
DROP POLICY IF EXISTS "todos_select_policy" ON todos;
DROP POLICY IF EXISTS "todos_insert_policy" ON todos;
DROP POLICY IF EXISTS "todos_update_policy" ON todos;
DROP POLICY IF EXISTS "todos_delete_policy" ON todos;
DROP POLICY IF EXISTS "admin_full_access_todos" ON todos;

-- 2. ROW LEVEL SECURITY 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 3. 기본 RLS 정책 생성 (실제 테이블 구조에 맞춤)
-- SELECT 정책: 사용자는 자신의 todos만 조회 가능
CREATE POLICY "todos_select_policy" ON todos
    FOR SELECT
    USING (auth.uid() = user_id);

-- INSERT 정책: 사용자는 자신의 todos만 생성 가능
CREATE POLICY "todos_insert_policy" ON todos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- UPDATE 정책: 사용자는 자신의 todos만 수정 가능
CREATE POLICY "todos_update_policy" ON todos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE 정책: 사용자는 자신의 todos만 삭제 가능
CREATE POLICY "todos_delete_policy" ON todos
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. 기본 인덱스 (성능 최적화)
-- user_id 기반 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_todos_user_id_created_at 
ON todos(user_id, created_at DESC);

-- 5. 권한 부여
-- authenticated 역할에 todos 테이블 접근 권한 부여
GRANT ALL ON todos TO authenticated;

-- ============================================================================
-- 끝
-- ============================================================================
