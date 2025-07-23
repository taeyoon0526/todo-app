// 방문자 추적기 즉시 복구 및 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

(function visitorTrackerEmergencyFix() {
    console.log('🔧 방문자 추적기 긴급 복구 시작...');
    
    // 1. 기존 visitorTracker 확인
    if (window.visitorTracker) {
        console.log('✅ window.visitorTracker 이미 존재');
        console.log('현재 상태:', {
            sessionId: window.visitorTracker.sessionId,
            isTracking: window.visitorTracker.isTracking
        });
        return testExistingTracker();
    }
    
    // 2. 전역 스코프에서 VisitorTracker 클래스 찾기
    if (typeof VisitorTracker !== 'undefined') {
        console.log('✅ VisitorTracker 클래스 발견, 인스턴스 생성');
        window.visitorTracker = new VisitorTracker();
        return testExistingTracker();
    }
    
    // 3. 간단한 VisitorTracker 재구현
    console.log('🛠️ 간단한 VisitorTracker 생성 중...');
    
    class SimpleVisitorTracker {
        constructor() {
            this.sessionId = 'emergency_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.isTracking = false;
            this.startTime = Date.now();
            console.log('✅ 긴급 VisitorTracker 생성됨');
        }
        
        // IP 감지
        async getClientIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                console.log('✅ IP 감지 성공:', data.ip);
                return data.ip;
            } catch (error) {
                console.log('❌ IP 감지 실패, 대체 시도...');
                try {
                    const response = await fetch('https://httpbin.org/ip');
                    const data = await response.json();
                    return data.origin.split(',')[0].trim();
                } catch (e) {
                    console.log('❌ 모든 IP 감지 실패');
                    return 'unknown';
                }
            }
        }
        
        // 디바이스 타입 감지
        getDeviceType() {
            const userAgent = navigator.userAgent.toLowerCase();
            if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
                return 'mobile';
            } else if (/tablet|ipad/i.test(userAgent)) {
                return 'tablet';
            } else {
                return 'desktop';
            }
        }
        
        // 브라우저 정보
        getBrowserInfo() {
            const userAgent = navigator.userAgent;
            if (userAgent.includes('Chrome')) return 'Chrome';
            if (userAgent.includes('Firefox')) return 'Firefox';
            if (userAgent.includes('Safari')) return 'Safari';
            if (userAgent.includes('Edge')) return 'Edge';
            return 'Unknown';
        }
        
        // OS 정보
        getOSInfo() {
            const userAgent = navigator.userAgent;
            if (userAgent.includes('Windows')) return 'Windows';
            if (userAgent.includes('Mac OS')) return 'macOS';
            if (userAgent.includes('Linux')) return 'Linux';
            if (userAgent.includes('Android')) return 'Android';
            if (userAgent.includes('iOS')) return 'iOS';
            return 'Unknown';
        }
        
        // 방문자 정보 수집
        async collectVisitorInfo() {
            try {
                const visitorInfo = {
                    ip_address: await this.getClientIP(),
                    user_id: null,
                    user_agent: navigator.userAgent,
                    referer: document.referrer || null,
                    url: window.location.href,
                    screen_resolution: `${screen.width}x${screen.height}`,
                    language: navigator.language,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    device_type: this.getDeviceType(),
                    browser: this.getBrowserInfo(),
                    os: this.getOSInfo(),
                    session_id: this.sessionId,
                    is_first_visit: !localStorage.getItem('visitor_session')
                };
                
                // 로그인 사용자 확인
                if (window.supabase && window.supabase.auth) {
                    try {
                        const { data: { user } } = await window.supabase.auth.getUser();
                        if (user) {
                            visitorInfo.user_id = user.id;
                        }
                    } catch (e) {
                        console.log('로그인 사용자 확인 실패');
                    }
                }
                
                return visitorInfo;
            } catch (error) {
                console.error('방문자 정보 수집 실패:', error);
                return null;
            }
        }
        
        // 방문 추적
        async trackVisit() {
            if (this.isTracking) {
                console.log('⚠️ 이미 추적 중입니다');
                return;
            }
            
            this.isTracking = true;
            console.log('📊 방문 추적 시작...');
            
            try {
                const visitorInfo = await this.collectVisitorInfo();
                if (!visitorInfo) {
                    throw new Error('방문자 정보 수집 실패');
                }
                
                console.log('📋 수집된 방문 데이터:', visitorInfo);
                
                // Supabase에 저장 시도
                if (window.supabase) {
                    const { data, error } = await window.supabase
                        .from('visitor_logs')
                        .insert([visitorInfo])
                        .select();
                    
                    if (error) {
                        throw error;
                    }
                    
                    console.log('✅ 방문 추적 완료:', data);
                    
                    // 세션 정보 저장
                    localStorage.setItem('visitor_session', this.sessionId);
                    localStorage.setItem('visitor_ip', visitorInfo.ip_address);
                    
                    return data;
                } else {
                    console.log('⚠️ Supabase 클라이언트가 없어 로컬 저장만 수행');
                    localStorage.setItem('visitor_session', this.sessionId);
                    localStorage.setItem('visitor_data', JSON.stringify(visitorInfo));
                    return [visitorInfo];
                }
                
            } catch (error) {
                console.error('❌ 방문 추적 실패:', error);
                throw error;
            } finally {
                this.isTracking = false;
            }
        }
        
        // 첫 방문 여부
        isFirstVisit() {
            return !localStorage.getItem('visitor_session');
        }
    }
    
    // 전역으로 등록
    window.visitorTracker = new SimpleVisitorTracker();
    
    console.log('✅ 긴급 방문자 추적기 생성 완료!');
    console.log('추적기 상태:', {
        sessionId: window.visitorTracker.sessionId,
        deviceType: window.visitorTracker.getDeviceType(),
        browser: window.visitorTracker.getBrowserInfo(),
        os: window.visitorTracker.getOSInfo()
    });
    
    // 즉시 테스트 실행
    return testExistingTracker();
    
    // 기존 추적기 테스트 함수
    async function testExistingTracker() {
        console.log('🧪 방문자 추적기 테스트 시작...');
        
        try {
            // 기본 정보 테스트
            console.log('✅ 세션 ID:', window.visitorTracker.sessionId);
            console.log('✅ 디바이스:', window.visitorTracker.getDeviceType());
            console.log('✅ 브라우저:', window.visitorTracker.getBrowserInfo());
            console.log('✅ OS:', window.visitorTracker.getOSInfo());
            
            // IP 감지 테스트
            console.log('🌐 IP 감지 테스트...');
            const ip = await window.visitorTracker.getClientIP();
            console.log('✅ 감지된 IP:', ip);
            
            // 방문자 정보 수집 테스트
            console.log('📊 방문자 정보 수집 테스트...');
            const visitorInfo = await window.visitorTracker.collectVisitorInfo();
            console.log('✅ 수집된 정보:', visitorInfo);
            
            // 방문 추적 테스트
            console.log('💾 방문 추적 테스트...');
            const result = await window.visitorTracker.trackVisit();
            console.log('✅ 추적 결과:', result);
            
            console.log('🎉 모든 테스트 통과!');
            
            return {
                status: 'success',
                sessionId: window.visitorTracker.sessionId,
                detectedIP: ip,
                visitorInfo: visitorInfo,
                trackingResult: result
            };
            
        } catch (error) {
            console.error('❌ 테스트 실패:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }
})();
