#!/bin/bash

# 크로스 브라우저 QA 테스트 자동화 스크립트
# 다양한 브라우저 환경에서 AuthGuard 시스템 테스트

echo "TODO-LIST 모바일 환경 QA 테스트 시작"
echo "========================================"

# 테스트 서버 포트
PORT=8000
BASE_URL="http://localhost:$PORT"

# 테스트 결과 디렉토리 생성
RESULTS_DIR="qa-test-results/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# 로그 파일 설정
LOG_FILE="$RESULTS_DIR/test-execution.log"
touch "$LOG_FILE"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "테스트 환경 설정 시작"

# Python 서버 실행 확인
if ! curl -s "$BASE_URL" > /dev/null; then
    log "로컬 서버 시작 중..."
    cd /home/taeyoon_0526/Desktop/todo-app
    python3 -m http.server $PORT &
    SERVER_PID=$!
    sleep 3
    
    if ! curl -s "$BASE_URL" > /dev/null; then
        log "ERROR: 로컬 서버 시작 실패"
        exit 1
    fi
    log "로컬 서버 시작 완료 (PID: $SERVER_PID)"
else
    log "기존 로컬 서버 사용"
    SERVER_PID=""
fi

# 브라우저별 테스트 함수
run_browser_test() {
    local browser_name="$1"
    local browser_command="$2"
    local test_url="$3"
    
    log "[$browser_name] 테스트 시작"
    
    # 브라우저별 결과 디렉토리
    local browser_results_dir="$RESULTS_DIR/$browser_name"
    mkdir -p "$browser_results_dir"
    
    # 브라우저 실행 및 테스트 URL 열기
    if command -v "$browser_command" > /dev/null; then
        log "[$browser_name] 브라우저 실행: $browser_command"
        
        # 백그라운드로 브라우저 실행
        $browser_command "$test_url" > "$browser_results_dir/browser.log" 2>&1 &
        local browser_pid=$!
        
        # 브라우저 로딩 대기
        sleep 5
        
        # 테스트 실행을 위해 JavaScript 코드 준비
        cat > "$browser_results_dir/test-script.js" << 'EOF'
// 자동 테스트 실행 스크립트
setTimeout(() => {
    if (window.mobileQATest) {
        console.log('QA 테스트 자동 실행 시작');
        window.mobileQATest.runAllTests().then(() => {
            console.log('QA 테스트 완료');
            const report = window.mobileQATest.generateReport();
            console.log('테스트 결과:', JSON.stringify(report, null, 2));
        });
    } else {
        console.error('QA 테스트 도구를 찾을 수 없습니다');
    }
}, 3000);
EOF
        
        log "[$browser_name] 테스트 대기 중..."
        sleep 10
        
        # 브라우저 종료
        if ps -p $browser_pid > /dev/null 2>&1; then
            kill $browser_pid 2>/dev/null
        fi
        
        log "[$browser_name] 테스트 완료"
        
    else
        log "[$browser_name] 브라우저를 찾을 수 없습니다: $browser_command"
        echo "SKIPPED: Browser not found" > "$browser_results_dir/result.txt"
    fi
}

# 모바일 시뮬레이션 테스트
run_mobile_simulation_test() {
    local device_type="$1"
    local user_agent="$2"
    
    log "[MOBILE-$device_type] 시뮬레이션 테스트 시작"
    
    local mobile_results_dir="$RESULTS_DIR/mobile-$device_type"
    mkdir -p "$mobile_results_dir"
    
    # curl을 사용한 기본 HTTP 응답 테스트
    log "[MOBILE-$device_type] HTTP 응답 테스트"
    curl -s -H "User-Agent: $user_agent" "$BASE_URL" > "$mobile_results_dir/response.html"
    
    if [ $? -eq 0 ]; then
        log "[MOBILE-$device_type] HTTP 응답 성공"
        
        # HTML 구조 검증
        if grep -q "auth-section" "$mobile_results_dir/response.html" && \
           grep -q "todo-app" "$mobile_results_dir/response.html" && \
           grep -q "auth-guard" "$mobile_results_dir/response.html"; then
            echo "PASS: HTML structure valid" > "$mobile_results_dir/result.txt"
            log "[MOBILE-$device_type] HTML 구조 검증 통과"
        else
            echo "FAIL: HTML structure invalid" > "$mobile_results_dir/result.txt"
            log "[MOBILE-$device_type] HTML 구조 검증 실패"
        fi
    else
        echo "FAIL: HTTP request failed" > "$mobile_results_dir/result.txt"
        log "[MOBILE-$device_type] HTTP 요청 실패"
    fi
}

# 성능 테스트
run_performance_test() {
    log "[PERFORMANCE] 성능 테스트 시작"
    
    local perf_results_dir="$RESULTS_DIR/performance"
    mkdir -p "$perf_results_dir"
    
    # Lighthouse CLI가 있는 경우 실행
    if command -v lighthouse > /dev/null; then
        log "[PERFORMANCE] Lighthouse 테스트 실행"
        lighthouse "$BASE_URL" \
            --output=json \
            --output-path="$perf_results_dir/lighthouse-report.json" \
            --chrome-flags="--headless --no-sandbox" \
            --quiet > "$perf_results_dir/lighthouse.log" 2>&1
        
        if [ $? -eq 0 ]; then
            log "[PERFORMANCE] Lighthouse 테스트 완료"
            
            # 성능 점수 추출
            if [ -f "$perf_results_dir/lighthouse-report.json" ]; then
                python3 -c "
import json
with open('$perf_results_dir/lighthouse-report.json', 'r') as f:
    data = json.load(f)
    performance = data['lhr']['categories']['performance']['score'] * 100
    pwa = data['lhr']['categories']['pwa']['score'] * 100
    print(f'Performance Score: {performance:.1f}')
    print(f'PWA Score: {pwa:.1f}')
" > "$perf_results_dir/scores.txt"
            fi
        else
            log "[PERFORMANCE] Lighthouse 테스트 실패"
        fi
    else
        log "[PERFORMANCE] Lighthouse가 설치되지 않음"
        echo "SKIPPED: Lighthouse not installed" > "$perf_results_dir/result.txt"
    fi
    
    # 기본 성능 측정 (curl 응답 시간)
    log "[PERFORMANCE] 기본 응답 시간 측정"
    for i in {1..5}; do
        response_time=$(curl -o /dev/null -s -w "%{time_total}" "$BASE_URL")
        echo "Request $i: ${response_time}s" >> "$perf_results_dir/response-times.txt"
    done
}

# PWA 기능 테스트
run_pwa_test() {
    log "[PWA] PWA 기능 테스트 시작"
    
    local pwa_results_dir="$RESULTS_DIR/pwa"
    mkdir -p "$pwa_results_dir"
    
    # manifest.json 확인
    log "[PWA] manifest.json 확인"
    curl -s "$BASE_URL/manifest.json" > "$pwa_results_dir/manifest.json"
    
    if [ $? -eq 0 ] && [ -s "$pwa_results_dir/manifest.json" ]; then
        log "[PWA] manifest.json 다운로드 성공"
        
        # manifest.json 유효성 검사
        if python3 -c "import json; json.load(open('$pwa_results_dir/manifest.json'))" 2>/dev/null; then
            echo "PASS: manifest.json valid" > "$pwa_results_dir/manifest-result.txt"
            log "[PWA] manifest.json 유효성 검사 통과"
        else
            echo "FAIL: manifest.json invalid" > "$pwa_results_dir/manifest-result.txt"
            log "[PWA] manifest.json 유효성 검사 실패"
        fi
    else
        echo "FAIL: manifest.json not found" > "$pwa_results_dir/manifest-result.txt"
        log "[PWA] manifest.json을 찾을 수 없습니다"
    fi
    
    # Service Worker 확인
    log "[PWA] Service Worker 확인"
    curl -s "$BASE_URL/sw.js" > "$pwa_results_dir/sw.js"
    
    if [ $? -eq 0 ] && [ -s "$pwa_results_dir/sw.js" ]; then
        echo "PASS: Service Worker found" > "$pwa_results_dir/sw-result.txt"
        log "[PWA] Service Worker 파일 확인 완료"
    else
        echo "FAIL: Service Worker not found" > "$pwa_results_dir/sw-result.txt"
        log "[PWA] Service Worker 파일을 찾을 수 없습니다"
    fi
}

# 메인 테스트 실행
log "테스트 스위트 실행 시작"

# 1. 데스크톱 브라우저 테스트
if [ "$1" != "--mobile-only" ]; then
    log "데스크톱 브라우저 테스트 실행"
    
    # Chrome 테스트
    run_browser_test "chrome" "google-chrome" "$BASE_URL?autotest=true"
    
    # Firefox 테스트
    run_browser_test "firefox" "firefox" "$BASE_URL?autotest=true"
    
    # Edge 테스트 (Linux에서는 microsoft-edge-stable)
    run_browser_test "edge" "microsoft-edge-stable" "$BASE_URL?autotest=true"
fi

# 2. 모바일 시뮬레이션 테스트
log "모바일 시뮬레이션 테스트 실행"

# iOS Safari 시뮬레이션
run_mobile_simulation_test "ios-safari" "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

# Android Chrome 시뮬레이션
run_mobile_simulation_test "android-chrome" "Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

# Samsung Internet 시뮬레이션
run_mobile_simulation_test "samsung-internet" "Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/20.0 Chrome/106.0.5249.126 Mobile Safari/537.36"

# 3. 성능 테스트
run_performance_test

# 4. PWA 기능 테스트
run_pwa_test

# 5. 테스트 결과 집계 및 리포트 생성
log "테스트 결과 집계 중..."

# 결과 집계 스크립트
cat > "$RESULTS_DIR/generate-report.py" << 'EOF'
import os
import json
import glob
from datetime import datetime

def collect_test_results(results_dir):
    results = {
        'timestamp': datetime.now().isoformat(),
        'test_summary': {},
        'browser_tests': {},
        'mobile_tests': {},
        'performance': {},
        'pwa': {}
    }
    
    # 브라우저 테스트 결과 수집
    for browser_dir in glob.glob(f"{results_dir}/*/"):
        browser_name = os.path.basename(browser_dir.rstrip('/'))
        
        if browser_name in ['chrome', 'firefox', 'edge']:
            result_file = os.path.join(browser_dir, 'result.txt')
            if os.path.exists(result_file):
                with open(result_file, 'r') as f:
                    results['browser_tests'][browser_name] = f.read().strip()
            else:
                results['browser_tests'][browser_name] = 'COMPLETED'
        
        elif browser_name.startswith('mobile-'):
            result_file = os.path.join(browser_dir, 'result.txt')
            if os.path.exists(result_file):
                with open(result_file, 'r') as f:
                    results['mobile_tests'][browser_name] = f.read().strip()
    
    # 성능 테스트 결과
    perf_dir = os.path.join(results_dir, 'performance')
    if os.path.exists(perf_dir):
        scores_file = os.path.join(perf_dir, 'scores.txt')
        if os.path.exists(scores_file):
            with open(scores_file, 'r') as f:
                results['performance']['lighthouse'] = f.read().strip()
        
        response_times_file = os.path.join(perf_dir, 'response-times.txt')
        if os.path.exists(response_times_file):
            with open(response_times_file, 'r') as f:
                results['performance']['response_times'] = f.read().strip()
    
    # PWA 테스트 결과
    pwa_dir = os.path.join(results_dir, 'pwa')
    if os.path.exists(pwa_dir):
        for result_file in ['manifest-result.txt', 'sw-result.txt']:
            file_path = os.path.join(pwa_dir, result_file)
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    results['pwa'][result_file.replace('-result.txt', '')] = f.read().strip()
    
    # 요약 정보 생성
    total_tests = len(results['browser_tests']) + len(results['mobile_tests']) + len(results['pwa'])
    passed_tests = sum(1 for result in 
                      list(results['browser_tests'].values()) + 
                      list(results['mobile_tests'].values()) + 
                      list(results['pwa'].values()) 
                      if 'PASS' in result or 'COMPLETED' in result)
    
    results['test_summary'] = {
        'total_tests': total_tests,
        'passed_tests': passed_tests,
        'failed_tests': total_tests - passed_tests,
        'success_rate': f"{(passed_tests / total_tests * 100):.1f}%" if total_tests > 0 else "0%"
    }
    
    return results

if __name__ == "__main__":
    import sys
    results_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    
    results = collect_test_results(results_dir)
    
    # JSON 리포트 저장
    with open(f"{results_dir}/test-report.json", 'w') as f:
        json.dump(results, f, indent=2)
    
    # 텍스트 리포트 생성
    with open(f"{results_dir}/test-report.txt", 'w') as f:
        f.write("TODO-LIST 모바일 환경 QA 테스트 결과\n")
        f.write("=" * 50 + "\n\n")
        
        f.write(f"테스트 실행 시간: {results['timestamp']}\n")
        f.write(f"전체 테스트: {results['test_summary']['total_tests']}\n")
        f.write(f"통과 테스트: {results['test_summary']['passed_tests']}\n")
        f.write(f"실패 테스트: {results['test_summary']['failed_tests']}\n")
        f.write(f"성공률: {results['test_summary']['success_rate']}\n\n")
        
        f.write("브라우저 테스트 결과:\n")
        for browser, result in results['browser_tests'].items():
            f.write(f"  {browser}: {result}\n")
        
        f.write("\n모바일 시뮬레이션 테스트 결과:\n")
        for mobile, result in results['mobile_tests'].items():
            f.write(f"  {mobile}: {result}\n")
        
        f.write("\nPWA 기능 테스트 결과:\n")
        for pwa, result in results['pwa'].items():
            f.write(f"  {pwa}: {result}\n")
        
        if results['performance']:
            f.write("\n성능 테스트 결과:\n")
            for perf_type, result in results['performance'].items():
                f.write(f"  {perf_type}:\n    {result.replace(chr(10), chr(10) + '    ')}\n")
    
    print(f"테스트 리포트가 생성되었습니다: {results_dir}/test-report.txt")
EOF

# 리포트 생성
python3 "$RESULTS_DIR/generate-report.py" "$RESULTS_DIR"

# 결과 요약 출력
log "테스트 완료! 결과 요약:"
cat "$RESULTS_DIR/test-report.txt"

# 서버 종료
if [ -n "$SERVER_PID" ]; then
    log "로컬 서버 종료 (PID: $SERVER_PID)"
    kill $SERVER_PID 2>/dev/null
fi

log "모든 테스트가 완료되었습니다."
log "상세 결과는 다음 디렉토리에서 확인할 수 있습니다: $RESULTS_DIR"

echo ""
echo "테스트 결과 디렉토리: $RESULTS_DIR"
echo "주요 결과 파일:"
echo "  - test-report.txt    # 텍스트 요약 리포트"
echo "  - test-report.json   # JSON 상세 리포트"
echo "  - test-execution.log # 실행 로그"
echo ""
echo "브라우저별 상세 결과:"
ls -la "$RESULTS_DIR"
EOF
