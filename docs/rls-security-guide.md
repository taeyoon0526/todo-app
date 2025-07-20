# Row Level Security (RLS) 정책 설정 가이드

## 개요
이 문서는 TODO-LIST 애플리케이션의 데이터 보안을 위한 Supabase RLS 정책 설정을 안내합니다.

## RLS 정책 적용 내용

### 1. 기본 보안 원칙
- 각 사용자는 본인이 생성한 할 일(todos)만 접근 가능
- JWT 토큰의 `auth.uid()`와 테이블의 `user_id` 컬럼 매칭
- 미인증 사용자는 모든 데이터 접근 차단

### 2. 적용된 정책 목록

#### SELECT 정책: "Users can view own todos"
```sql
CREATE POLICY "Users can view own todos" ON todos
    FOR SELECT USING (auth.uid() = user_id);
```
- 목적: 사용자 본인의 할 일만 조회 가능
- 조건: JWT의 user_id와 테이블의 user_id 일치

#### INSERT 정책: "Users can insert own todos"
```sql
CREATE POLICY "Users can insert own todos" ON todos
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```
- 목적: 본인 명의로만 할 일 생성 가능
- 조건: 생성 시 user_id가 현재 인증된 사용자와 일치

#### UPDATE 정책: "Users can update own todos"
```sql
CREATE POLICY "Users can update own todos" ON todos
    FOR UPDATE USING (auth.uid() = user_id);
```
- 목적: 본인의 할 일만 수정 가능
- 조건: 수정 대상의 user_id가 현재 사용자와 일치

#### DELETE 정책: "Users can delete own todos"
```sql
CREATE POLICY "Users can delete own todos" ON todos
    FOR DELETE USING (auth.uid() = user_id);
```
- 목적: 본인의 할 일만 삭제 가능
- 조건: 삭제 대상의 user_id가 현재 사용자와 일치

### 3. 설정 방법

1. **Supabase 대시보드 접속**
   - 프로젝트 대시보드 → SQL Editor 이동

2. **RLS 정책 SQL 실행**
   ```bash
   # database/rls-policies.sql 파일의 내용을 복사하여 실행
   ```

3. **정책 확인**
   ```sql
   -- 정책 목록 확인
   SELECT * FROM pg_policies WHERE tablename = 'todos';
   
   -- RLS 활성화 상태 확인
   SELECT schemaname, tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'todos';
   ```

### 4. 테스트 시나리오

#### 정상 시나리오
- ✅ 로그인한 사용자가 본인의 할 일 CRUD
- ✅ JWT 토큰이 올바른 경우 데이터 접근

#### 차단 시나리오
- ❌ 미인증 사용자의 모든 데이터 접근
- ❌ 다른 사용자의 할 일 조회/수정/삭제 시도
- ❌ 만료된 JWT 토큰으로 접근 시도

### 5. 보안 검증 체크리스트

- [ ] RLS가 todos 테이블에 활성화되었는지 확인
- [ ] 4개의 CRUD 정책이 모두 생성되었는지 확인
- [ ] 다른 사용자 계정으로 교차 접근 테스트
- [ ] 비로그인 상태에서 API 호출 차단 확인
- [ ] JWT 만료 시나리오 테스트

### 6. 주의사항

1. **service_role 키 사용 금지**
   - 프론트엔드에서는 반드시 `anon` 키만 사용
   - service_role 키는 서버사이드에서만 사용

2. **정책 수정 시 주의**
   - 정책 변경 후 기존 연결 세션 재시작 필요
   - 테스트 환경에서 충분히 검증 후 운영 적용

3. **디버깅**
   - RLS 정책 오류 시 Supabase 로그 확인
   - `auth.uid()` 값이 올바르게 전달되는지 확인

## 문제 해결

### 자주 발생하는 오류

1. **"permission denied for table todos"**
   - RLS 정책이 올바르게 설정되지 않음
   - JWT 토큰이 올바르게 전달되지 않음

2. **빈 결과 반환**
   - user_id 컬럼 값과 auth.uid() 불일치
   - JWT 토큰 만료 또는 무효

3. **정책이 적용되지 않음**
   - RLS가 비활성화되어 있음
   - 정책 조건식 오류

### 해결 방법

1. 정책 재생성
2. RLS 상태 확인 및 재활성화
3. JWT 토큰 갱신
4. Supabase 연결 재시작
