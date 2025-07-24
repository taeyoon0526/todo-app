-- ============================================================================
-- TODO-LIST Application - Enhanced RLS Policies and Security Rules
-- 
-- 추가 RLS 정책 및 보안 규칙 강화
-- T-034 구현을 위한 Supabase SQL 스크립트
-- 
-- Copyright (c) 2025 taeyoon0526
-- ============================================================================

-- 1. 기존 RLS 정책 확인 및 삭제 (필요시)
-- 기존 정책들을 확인하고 필요시 삭제합니다.

-- todos 테이블에 대한 기존 정책 삭제 (이미 있다면)
DROP POLICY IF EXISTS "Users can view their own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON todos;
DROP POLICY IF EXISTS "todos_select_policy" ON todos;
DROP POLICY IF EXISTS "todos_insert_policy" ON todos;
DROP POLICY IF EXISTS "todos_update_policy" ON todos;
DROP POLICY IF EXISTS "todos_delete_policy" ON todos;
DROP POLICY IF EXISTS "admin_full_access_todos" ON todos;

-- ============================================================================
-- 2. ROW LEVEL SECURITY 활성화
-- ============================================================================

-- todos 테이블에 RLS 활성화
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. TODOS 테이블 RLS 정책 생성
-- ============================================================================

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

-- ============================================================================
-- 4. 보안 강화를 위한 추가 정책
-- ============================================================================

-- 관리자 전용 SELECT 정책 (관리 목적)
-- 특정 역할(admin)이 있는 사용자만 모든 데이터 조회 가능
CREATE POLICY "admin_full_access_todos" ON todos
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- ============================================================================
-- 5. SECURITY 스키마 생성 및 보안 함수 생성
-- ============================================================================

-- security 스키마 생성 (존재하지 않는 경우)
CREATE SCHEMA IF NOT EXISTS security;

-- 현재 사용자 ID 검증 함수
CREATE OR REPLACE FUNCTION security.validate_user_id(input_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 인증된 사용자인지 확인
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- 입력된 user_id가 현재 인증된 사용자와 일치하는지 확인
    RETURN auth.uid() = input_user_id;
END;
$$;

-- 사용자별 todo 개수 제한 함수 (DoS 방지)
CREATE OR REPLACE FUNCTION security.check_todo_limit(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    todo_count INTEGER;
    max_todos INTEGER := 1000; -- 사용자당 최대 1000개 todo
BEGIN
    -- 현재 사용자의 todo 개수 확인
    SELECT COUNT(*) INTO todo_count
    FROM todos
    WHERE todos.user_id = check_todo_limit.user_id;
    
    RETURN todo_count < max_todos;
END;
$$;

-- ============================================================================
-- 7. 트리거 함수 생성 (보안 강화)
-- ============================================================================

-- todos 삽입 시 보안 검증 트리거 함수
CREATE OR REPLACE FUNCTION security.todos_insert_security_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 사용자 ID 검증
    IF NOT security.validate_user_id(NEW.user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid user_id';
    END IF;
    
    -- todo 개수 제한 검증
    IF NOT security.check_todo_limit(NEW.user_id) THEN
        RAISE EXCEPTION 'Todo limit exceeded: Maximum 1000 todos per user';
    END IF;
    
    -- title 길이 검증 (XSS 방지)
    IF LENGTH(NEW.title) > 500 THEN
        RAISE EXCEPTION 'Title too long: Maximum 500 characters';
    END IF;
    
    -- 악성 스크립트 패턴 검사
    IF NEW.title ~* '<script|javascript:|on\w+=' THEN
        RAISE EXCEPTION 'Potentially malicious content detected';
    END IF;
    
    RETURN NEW;
END;
$$;

-- todos 업데이트 시 보안 검증 트리거 함수
CREATE OR REPLACE FUNCTION security.todos_update_security_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 사용자 ID 변경 방지
    IF OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Unauthorized: Cannot change user_id';
    END IF;
    
    -- 사용자 ID 검증
    IF NOT security.validate_user_id(NEW.user_id) THEN
        RAISE EXCEPTION 'Unauthorized: Invalid user_id';
    END IF;
    
    -- title 길이 검증
    IF LENGTH(NEW.title) > 500 THEN
        RAISE EXCEPTION 'Title too long: Maximum 500 characters';
    END IF;
    
    -- 악성 스크립트 패턴 검사
    IF NEW.title ~* '<script|javascript:|on\w+=' THEN
        RAISE EXCEPTION 'Potentially malicious content detected';
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 8. 트리거 생성
-- ============================================================================

-- todos INSERT 트리거
CREATE TRIGGER todos_insert_security_trigger
    BEFORE INSERT ON todos
    FOR EACH ROW
    EXECUTE FUNCTION security.todos_insert_security_check();

-- todos UPDATE 트리거
CREATE TRIGGER todos_update_security_trigger
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION security.todos_update_security_check();

-- ============================================================================
-- 9. 인덱스 최적화 (보안 성능 향상)
-- ============================================================================

-- user_id 기반 쿼리 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_todos_user_id_created_at 
ON todos(user_id, created_at DESC);

-- user_id와 status 상태 기반 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_todos_user_id_status 
ON todos(user_id, status, created_at DESC);

-- ============================================================================
-- 10. 데이터베이스 레벨 보안 설정
-- ============================================================================

-- 중요: 이 설정들은 Supabase 대시보드에서 수동으로 설정해야 할 수 있습니다.

-- SQL 주석으로 설정 가이드 제공:
/*
Supabase Dashboard에서 추가 설정 필요:

1. Authentication Settings:
   - Enable email confirmations
   - Set strong password requirements
   - Configure rate limiting
   - Enable CAPTCHA for sensitive operations

2. API Settings:
   - Set request rate limits
   - Configure CORS properly
   - Enable request logging

3. Database Settings:
   - Enable audit logging
   - Set connection limits
   - Configure SSL enforcement

4. Security Headers:
   - Content-Security-Policy
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Referrer-Policy: strict-origin-when-cross-origin
*/

-- ============================================================================
-- 11. 권한 부여
-- ============================================================================

-- authenticated 역할에 필요한 권한 부여
GRANT USAGE ON SCHEMA security TO authenticated;
GRANT EXECUTE ON FUNCTION security.validate_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION security.check_todo_limit TO authenticated;

-- ============================================================================
-- 12. 정책 검증 쿼리
-- ============================================================================

-- 정책이 올바르게 적용되었는지 확인하는 쿼리들:
/*
-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('todos', 'users');

-- 트리거 확인
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('todos', 'users');

-- 인덱스 확인
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'todos';
*/

-- ============================================================================
-- 끝
-- ============================================================================
