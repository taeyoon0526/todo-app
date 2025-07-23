// 통합 테스트 및 검증 스크립트
// 전체 시스템의 동작을 한 번에 테스트합니다

(function createIntegratedTest() {
    console.log('🧪 통합 테스트 시스템 초기화...');

    const IntegratedTest = {
        testResults: [],
        
        // 전체 테스트 실행
        async runAllTests() {
            console.log('🚀 전체 시스템 테스트 시작...\n');
            this.testResults = [];
            
            const tests = [
                { name: '인증 시스템', func: this.testAuthSystem },
                { name: '방문자 추적기', func: this.testVisitorTracker },
                { name: 'IP 감지', func: this.testIPDetection },
                { name: 'Supabase 연결', func: this.testSupabaseConnection },
                { name: '데이터 저장', func: this.testDataStorage },
                { name: '브라우저 호환성', func: this.testBrowserCompatibility },
                { name: '성능', func: this.testPerformance }
            ];
            
            for (const test of tests) {
                await this.runSingleTest(test.name, test.func.bind(this));
            }
            
            this.generateReport();
        },
        
        // 개별 테스트 실행
        async runSingleTest(testName, testFunc) {
            console.log(`🔍 ${testName} 테스트 중...`);
            
            const startTime = Date.now();
            let result = { name: testName, status: 'PASS', message: '', duration: 0, details: {} };
            
            try {
                const testResult = await testFunc();
                result.details = testResult || {};
                console.log(`✅ ${testName}: 통과`);
            } catch (error) {
                result.status = 'FAIL';
                result.message = error.message;
                result.details.error = error;
                console.log(`❌ ${testName}: 실패 - ${error.message}`);
            }
            
            result.duration = Date.now() - startTime;
            this.testResults.push(result);
        },
        
        // 1. 인증 시스템 테스트
        async testAuthSystem() {
            const details = {};
            
            // AuthGuard 존재 확인
            if (!window.getAuthGuard) {
                throw new Error('AuthGuard 함수가 존재하지 않습니다');
            }
            
            const authGuard = window.getAuthGuard();
            if (!authGuard) {
                throw new Error('AuthGuard 인스턴스가 없습니다');
            }
            
            details.authGuardExists = true;
            details.authState = authGuard.getAuthenticationState();
            
            // 인증 상태 확인
            if (authGuard.authCheckInProgress) {
                throw new Error('인증 체크가 무한 루프에 빠져있습니다');
            }
            
            details.authCheckComplete = authGuard.isAuthChecked;
            
            return details;
        },
        
        // 2. 방문자 추적기 테스트
        async testVisitorTracker() {
            const details = {};
            
            if (!window.visitorTracker) {
                throw new Error('방문자 추적기가 로드되지 않았습니다');
            }
            
            details.sessionId = window.visitorTracker.sessionId;
            details.isTracking = window.visitorTracker.isTracking;
            
            // 디바이스 정보 수집
            details.deviceType = window.visitorTracker.getDeviceType();
            details.browser = window.visitorTracker.getBrowserInfo();
            details.os = window.visitorTracker.getOSInfo();
            
            if (!details.deviceType || !details.browser || !details.os) {
                throw new Error('디바이스 정보 수집에 실패했습니다');
            }
            
            return details;
        },
        
        // 3. IP 감지 테스트
        async testIPDetection() {
            const details = {};
            
            if (!window.visitorTracker) {
                throw new Error('방문자 추적기가 없어 IP 테스트 불가');
            }
            
            try {
                const ip = await window.visitorTracker.getClientIP();
                if (!ip || ip === 'unknown') {
                    throw new Error('IP 주소를 감지하지 못했습니다');
                }
                
                details.detectedIP = ip;
                details.ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
                
                if (!details.ipRegex) {
                    throw new Error('감지된 IP 주소 형식이 올바르지 않습니다');
                }
                
            } catch (error) {
                throw new Error(`IP 감지 실패: ${error.message}`);
            }
            
            return details;
        },
        
        // 4. Supabase 연결 테스트
        async testSupabaseConnection() {
            const details = {};
            
            // Supabase 클라이언트 확인
            let supabaseClient = window.supabase;
            if (!supabaseClient) {
                throw new Error('Supabase 클라이언트를 찾을 수 없습니다');
            }
            
            details.clientExists = true;
            
            // 연결 테스트 (간단한 쿼리)
            try {
                const { data, error } = await supabaseClient
                    .from('visitor_logs')
                    .select('count')
                    .limit(1);
                
                if (error) {
                    throw new Error(`Supabase 쿼리 오류: ${error.message}`);
                }
                
                details.connectionTest = 'SUCCESS';
                details.queryResult = data;
                
            } catch (error) {
                throw new Error(`Supabase 연결 테스트 실패: ${error.message}`);
            }
            
            return details;
        },
        
        // 5. 데이터 저장 테스트
        async testDataStorage() {
            const details = {};
            
            if (!window.visitorTracker) {
                throw new Error('방문자 추적기가 없어 데이터 저장 테스트 불가');
            }
            
            try {
                // 방문자 정보 수집
                const visitorInfo = await window.visitorTracker.collectVisitorInfo();
                if (!visitorInfo) {
                    throw new Error('방문자 정보 수집 실패');
                }
                
                details.visitorInfoCollected = true;
                details.hasIP = !!visitorInfo.ip_address;
                details.hasUserAgent = !!visitorInfo.user_agent;
                details.hasSessionId = !!visitorInfo.session_id;
                
                // 실제 저장 테스트는 위험할 수 있으므로 정보만 확인
                details.readyForStorage = details.hasIP && details.hasUserAgent && details.hasSessionId;
                
            } catch (error) {
                throw new Error(`데이터 저장 테스트 실패: ${error.message}`);
            }
            
            return details;
        },
        
        // 6. 브라우저 호환성 테스트
        async testBrowserCompatibility() {
            const details = {};
            
            // 필수 기능 지원 여부 확인
            const features = {
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage,
                fetch: !!window.fetch,
                Promise: !!window.Promise,
                async: typeof async !== 'undefined',
                geolocation: !!navigator.geolocation,
                userAgent: !!navigator.userAgent,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            };
            
            details.features = features;
            
            // 필수 기능 누락 확인
            const requiredFeatures = ['localStorage', 'fetch', 'Promise', 'userAgent'];
            const missingFeatures = requiredFeatures.filter(feature => !features[feature]);
            
            if (missingFeatures.length > 0) {
                throw new Error(`필수 기능 누락: ${missingFeatures.join(', ')}`);
            }
            
            details.browserInfo = {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                cookieEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
            };
            
            return details;
        },
        
        // 7. 성능 테스트
        async testPerformance() {
            const details = {};
            
            if (typeof performance === 'undefined') {
                throw new Error('Performance API를 사용할 수 없습니다');
            }
            
            // 페이지 로드 성능
            if (performance.timing) {
                const timing = performance.timing;
                details.pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                details.domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
                details.firstPaintTime = timing.responseStart - timing.navigationStart;
            }
            
            // 메모리 사용량 (Chrome)
            if (performance.memory) {
                details.memoryUsage = {
                    used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                };
            }
            
            // 현재 시간 기준 성능 측정
            const startTime = performance.now();
            
            // 간단한 연산 수행
            for (let i = 0; i < 100000; i++) {
                Math.random();
            }
            
            const endTime = performance.now();
            details.computationTime = endTime - startTime;
            
            // 성능 기준 체크
            if (details.pageLoadTime > 10000) { // 10초 이상
                throw new Error('페이지 로드 시간이 너무 깁니다');
            }
            
            if (details.computationTime > 100) { // 100ms 이상
                throw new Error('JavaScript 실행 성능이 저하되었습니다');
            }
            
            return details;
        },
        
        // 테스트 보고서 생성
        generateReport() {
            console.log('\n📊 테스트 결과 보고서');
            console.log('='.repeat(50));
            
            const totalTests = this.testResults.length;
            const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
            const failedTests = totalTests - passedTests;
            
            console.log(`📈 전체 테스트: ${totalTests}개`);
            console.log(`✅ 통과: ${passedTests}개`);
            console.log(`❌ 실패: ${failedTests}개`);
            console.log(`📊 성공률: ${Math.round((passedTests / totalTests) * 100)}%`);
            
            console.log('\n📋 상세 결과:');
            this.testResults.forEach(result => {
                const status = result.status === 'PASS' ? '✅' : '❌';
                console.log(`${status} ${result.name} (${result.duration}ms)`);
                if (result.message) {
                    console.log(`   └─ ${result.message}`);
                }
            });
            
            // 권장사항
            if (failedTests > 0) {
                console.log('\n💡 권장사항:');
                this.testResults.filter(r => r.status === 'FAIL').forEach(result => {
                    console.log(`• ${result.name}: ${result.message}`);
                });
            }
            
            console.log('\n' + '='.repeat(50));
            
            return {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                successRate: Math.round((passedTests / totalTests) * 100),
                results: this.testResults
            };
        },
        
        // 상세 진단 정보 출력
        showDetailedInfo() {
            console.log('\n🔍 상세 진단 정보');
            console.log('='.repeat(50));
            
            this.testResults.forEach(result => {
                console.log(`\n📂 ${result.name}:`);
                console.log(`   상태: ${result.status}`);
                console.log(`   소요시간: ${result.duration}ms`);
                
                if (result.details && Object.keys(result.details).length > 0) {
                    console.log('   세부정보:');
                    Object.entries(result.details).forEach(([key, value]) => {
                        if (typeof value === 'object') {
                            console.log(`     ${key}:`, value);
                        } else {
                            console.log(`     ${key}: ${value}`);
                        }
                    });
                }
            });
        }
    };
    
    // 전역으로 등록
    window.IntegratedTest = IntegratedTest;
    
    console.log('✅ 통합 테스트 시스템 준비 완료!');
    console.log('\n📋 사용 가능한 명령어:');
    console.log('  IntegratedTest.runAllTests()    - 전체 테스트 실행');
    console.log('  IntegratedTest.generateReport() - 테스트 보고서 생성');
    console.log('  IntegratedTest.showDetailedInfo() - 상세 진단 정보 출력');
    
    return IntegratedTest;
})();
