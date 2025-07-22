# 🌐 방문자 IP 추적 시스템 설정 가이드

## 📋 개요
웹사이트 방문자들의 IP 주소와 방문 정보를 자동으로 추적하고 분석하는 시스템입니다.

## 🚀 설정 순서

### 1단계: Supabase 데이터베이스 설정
Supabase 대시보드의 SQL Editor에서 순서대로 실행하세요:

```bash
# 1. 방문자 로그 테이블 및 뷰 생성
docs/visitor-tracking-sql.sql

# 2. IP 감지 함수 및 트리거 생성  
docs/visitor-tracking-functions.sql
```

### 2단계: 애플리케이션 설정 확인
다음 파일들이 자동으로 연동됩니다:

- `scripts/visitor-tracker.js` - 방문자 추적 모듈
- `scripts/main.js` - 자동 추적 시작
- `admin/visitor-dashboard.html` - 관리자 대시보드

### 3단계: 방문자 대시보드 접속
```
http://your-domain/admin/visitor-dashboard.html
```

## 📊 수집되는 데이터

### 기본 정보
- **IP 주소** - 자동 감지 (CloudFlare, X-Forwarded-For 우선)
- **방문 시간** - 정확한 타임스탬프
- **세션 ID** - 고유 브라우저 세션 추적
- **사용자 ID** - 로그인한 경우

### 기술 정보
- **User Agent** - 전체 브라우저 정보
- **디바이스 타입** - Mobile/Desktop/Tablet
- **브라우저** - Chrome, Firefox, Safari 등
- **운영체제** - Windows, macOS, Linux 등
- **화면 해상도** - 1920x1080 형식

### 행동 분석
- **페이지 URL** - 현재 방문 페이지
- **Referer** - 유입 경로
- **언어 설정** - 브라우저 언어
- **시간대** - 사용자 타임존
- **최초 방문 여부** - LocalStorage 기반
- **방문 시간** - 페이지에 머문 시간 (초)
- **페이지 뷰 수** - 세션 내 페이지 이동 횟수

## 🔒 개인정보 보호

### 자동 익명화
- IP 주소는 INET 타입으로 암호화 저장
- 개인 식별 정보는 수집하지 않음
- 쿠키 사용 최소화 (LocalStorage만 사용)

### 데이터 보존 정책
```sql
-- 90일 이후 자동 삭제 (선택사항)
DELETE FROM visitor_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## 📈 실시간 통계 조회

### 자주 사용하는 쿼리들

#### 1. 실시간 방문자 수
```sql
SELECT get_live_visitor_count();
```

#### 2. 오늘의 방문 통계
```sql
SELECT * FROM daily_visitor_stats 
WHERE visit_date = CURRENT_DATE;
```

#### 3. 상위 방문 IP (최근 일주일)
```sql
SELECT * FROM get_ip_visit_stats(10)
WHERE last_visit > NOW() - INTERVAL '7 days';
```

#### 4. 디바이스별 통계
```sql
SELECT 
    device_type,
    COUNT(*) as visits,
    COUNT(DISTINCT ip_address) as unique_visitors
FROM visitor_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY device_type;
```

#### 5. 브라우저별 통계
```sql
SELECT 
    browser,
    COUNT(*) as visits,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM visitor_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY browser
ORDER BY visits DESC;
```

## 🛠️ 고급 설정

### 1. IP 지역 정보 추가 (선택사항)
외부 IP 지역 조회 API와 연동:

```javascript
// scripts/visitor-tracker.js에 추가
async function getLocationInfo(ip) {
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name,
            city: data.city,
            region: data.region
        };
    } catch (error) {
        return { country: null, city: null, region: null };
    }
}
```

### 2. 봇 트래픽 필터링
```sql
-- 봇 User-Agent 패턴 필터링
ALTER TABLE visitor_logs ADD COLUMN is_bot BOOLEAN DEFAULT false;

UPDATE visitor_logs SET is_bot = true 
WHERE user_agent ~* 'bot|crawler|spider|scraper';
```

### 3. 성능 최적화
```sql
-- 파티셔닝 설정 (대용량 데이터용)
CREATE TABLE visitor_logs_y2025m01 PARTITION OF visitor_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

## 📱 모바일 최적화

### 모바일 방문자 특별 처리
```javascript
// 모바일에서 배터리 절약을 위한 설정
if (visitorTracker.getDeviceType() === 'mobile') {
    // 5분마다 업데이트 (데스크톱은 1분)
    setInterval(trackDuration, 5 * 60 * 1000);
}
```

## 🚨 문제 해결

### 일반적인 문제들

1. **IP 주소가 0.0.0.0으로 저장되는 경우**
   - Supabase 헤더 설정 확인
   - 프록시/CDN 설정 점검

2. **트리거가 작동하지 않는 경우**
   ```sql
   -- 트리거 상태 확인
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_set_visitor_ip';
   ```

3. **대시보드가 빈 데이터를 보여주는 경우**
   - RLS 정책 확인
   - 함수 권한 확인

## 🔍 모니터링

### 시스템 상태 점검
```sql
-- 테이블 크기 모니터링
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE tablename = 'visitor_logs';

-- 최근 24시간 방문 추이
SELECT 
    date_trunc('hour', created_at) as hour,
    COUNT(*) as visits
FROM visitor_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## 📞 지원

문제가 발생하면 다음 정보와 함께 문의하세요:
- 브라우저 콘솔 에러 메시지
- Supabase 함수 실행 결과
- 방문자 대시보드 스크린샷

---
*이 시스템은 자동으로 모든 방문자의 IP 주소를 추적하여 웹사이트 분석에 도움을 드립니다.*
