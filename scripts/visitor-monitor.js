// 실시간 방문자 추적 모니터링 콘솔 도구
// 브라우저 콘솔에서 실행하여 실시간으로 방문자 데이터를 확인하세요

(function createVisitorMonitor() {
    console.log('🖥️ 실시간 방문자 모니터링 도구 초기화...');

    // 모니터링 객체 생성
    const VisitorMonitor = {
        isRunning: false,
        intervalId: null,
        
        // 모니터링 시작
        start() {
            if (this.isRunning) {
                console.log('⚠️ 모니터링이 이미 실행 중입니다');
                return;
            }
            
            console.log('🟢 실시간 모니터링 시작 (10초 간격)');
            this.isRunning = true;
            
            // 즉시 첫 번째 체크 실행
            this.checkStatus();
            
            // 10초마다 반복 실행
            this.intervalId = setInterval(() => {
                this.checkStatus();
            }, 10000);
        },
        
        // 모니터링 중지
        stop() {
            if (!this.isRunning) {
                console.log('⚠️ 모니터링이 실행되고 있지 않습니다');
                return;
            }
            
            console.log('🔴 실시간 모니터링 중지');
            this.isRunning = false;
            
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
        },
        
        // 현재 상태 체크
        async checkStatus() {
            const timestamp = new Date().toLocaleTimeString('ko-KR');
            console.log(`\n🔍 [${timestamp}] 방문자 추적 상태 체크`);
            
            try {
                // 1. 방문자 추적기 상태
                if (window.visitorTracker) {
                    console.log('✅ 방문자 추적기: 활성');
                    console.log(`   세션 ID: ${window.visitorTracker.sessionId}`);
                    console.log(`   추적 상태: ${window.visitorTracker.isTracking ? '활성' : '비활성'}`);
                    
                    // IP 주소 확인
                    try {
                        const ip = await window.visitorTracker.getClientIP();
                        console.log(`   현재 IP: ${ip}`);
                    } catch (e) {
                        console.log('   IP 감지: 실패');
                    }
                } else {
                    console.log('❌ 방문자 추적기: 비활성');
                }
                
                // 2. 방문자 정보 수집 테스트
                if (window.visitorTracker) {
                    const visitorInfo = await window.visitorTracker.collectVisitorInfo();
                    if (visitorInfo) {
                        console.log('✅ 방문자 정보 수집: 성공');
                        console.log(`   디바이스: ${visitorInfo.device_type}`);
                        console.log(`   브라우저: ${visitorInfo.browser}`);
                        console.log(`   OS: ${visitorInfo.os}`);
                        console.log(`   해상도: ${visitorInfo.screen_resolution}`);
                        console.log(`   언어: ${visitorInfo.language}`);
                        console.log(`   시간대: ${visitorInfo.timezone}`);
                    } else {
                        console.log('❌ 방문자 정보 수집: 실패');
                    }
                }
                
                // 3. 페이지 성능 정보
                if (typeof performance !== 'undefined' && performance.navigation) {
                    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                    console.log(`📊 페이지 로드 시간: ${loadTime}ms`);
                }
                
                // 4. 메모리 사용량 (Chrome에서만)
                if (performance.memory) {
                    const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
                    console.log(`💾 메모리 사용량: ${memoryMB}MB`);
                }
                
            } catch (error) {
                console.error('❌ 상태 체크 중 오류:', error);
            }
        },
        
        // 방문 추적 강제 실행
        async forceTrack() {
            console.log('🎯 방문 추적 강제 실행...');
            
            if (!window.visitorTracker) {
                console.log('❌ 방문자 추적기가 없습니다');
                return;
            }
            
            try {
                await window.visitorTracker.trackVisit();
                console.log('✅ 방문 추적 완료');
            } catch (error) {
                console.error('❌ 방문 추적 실패:', error);
            }
        },
        
        // 상세 진단 실행
        async runDiagnostics() {
            console.log('\n🔧 상세 진단 시작...');
            
            // 필수 요소 체크
            const checks = [
                { name: 'window.visitorTracker', value: !!window.visitorTracker },
                { name: 'window.supabase', value: !!window.supabase },
                { name: 'navigator.geolocation', value: !!navigator.geolocation },
                { name: 'localStorage', value: !!window.localStorage },
                { name: 'sessionStorage', value: !!window.sessionStorage },
                { name: 'WebRTC support', value: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) },
                { name: 'Service Worker', value: 'serviceWorker' in navigator }
            ];
            
            checks.forEach(check => {
                const status = check.value ? '✅' : '❌';
                console.log(`${status} ${check.name}: ${check.value}`);
            });
            
            // 네트워크 연결 상태
            if (navigator.onLine !== undefined) {
                console.log(`📶 네트워크 상태: ${navigator.onLine ? '온라인' : '오프라인'}`);
            }
            
            // 쿠키 지원
            console.log(`🍪 쿠키 지원: ${navigator.cookieEnabled ? '활성' : '비활성'}`);
            
            // 사용자 에이전트
            console.log(`🌐 User Agent: ${navigator.userAgent.substring(0, 100)}...`);
        },
        
        // 방문자 통계 요약
        getStats() {
            if (!window.visitorTracker) {
                console.log('❌ 방문자 추적기가 없어 통계를 가져올 수 없습니다');
                return;
            }
            
            const stats = {
                sessionId: window.visitorTracker.sessionId,
                startTime: new Date(window.visitorTracker.startTime).toLocaleString('ko-KR'),
                isTracking: window.visitorTracker.isTracking,
                deviceType: window.visitorTracker.getDeviceType(),
                browser: window.visitorTracker.getBrowserInfo(),
                os: window.visitorTracker.getOSInfo(),
                isFirstVisit: window.visitorTracker.isFirstVisit()
            };
            
            console.table(stats);
            return stats;
        }
    };
    
    // 전역으로 등록
    window.VisitorMonitor = VisitorMonitor;
    
    console.log('✅ 실시간 방문자 모니터링 도구 준비 완료!');
    console.log('\n📋 사용 가능한 명령어:');
    console.log('  VisitorMonitor.start()        - 실시간 모니터링 시작 (10초 간격)');
    console.log('  VisitorMonitor.stop()         - 모니터링 중지');
    console.log('  VisitorMonitor.checkStatus()  - 현재 상태 체크');
    console.log('  VisitorMonitor.forceTrack()   - 방문 추적 강제 실행');
    console.log('  VisitorMonitor.runDiagnostics() - 상세 진단 실행');
    console.log('  VisitorMonitor.getStats()     - 방문자 통계 요약');
    
    // 자동으로 첫 번째 상태 체크 실행
    setTimeout(() => {
        VisitorMonitor.checkStatus();
    }, 1000);
    
    return VisitorMonitor;
})();
