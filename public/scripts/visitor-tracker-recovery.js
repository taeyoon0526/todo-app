// 방문자 추적기 강제 로딩 및 진단 스크립트
// 브라우저 콘솔에서 실행하세요

console.log('🔍 방문자 추적기 로딩 상태 진단 시작...');

// 1. 현재 상태 확인
console.log('window.visitorTracker 상태:', typeof window.visitorTracker);
console.log('모든 window 프로퍼티에서 visitor 관련 검색:');

// window 객체에서 visitor 관련 프로퍼티 찾기
Object.keys(window).filter(key => key.toLowerCase().includes('visitor')).forEach(key => {
    console.log(`  - ${key}:`, window[key]);
});

// 2. 스크립트 태그 확인
const scriptTags = document.querySelectorAll('script[src*="visitor"]');
console.log('방문자 추적 스크립트 태그:', scriptTags.length, '개');
scriptTags.forEach((script, index) => {
    console.log(`  Script ${index + 1}:`, script.src, '- 로드됨:', script.readyState);
});

// 3. 동적 import로 강제 로딩 시도
async function forceLoadVisitorTracker() {
    console.log('🔄 방문자 추적기 강제 로딩 시도...');
    
    try {
        // 방법 1: 상대 경로로 import
        const module1 = await import('./scripts/visitor-tracker.js');
        if (module1.visitorTracker) {
            window.visitorTracker = module1.visitorTracker;
            console.log('✅ 상대 경로 import 성공');
            return module1.visitorTracker;
        }
    } catch (error) {
        console.log('⚠️ 상대 경로 import 실패:', error.message);
    }
    
    try {
        // 방법 2: 절대 경로로 import
        const module2 = await import('/scripts/visitor-tracker.js');
        if (module2.visitorTracker) {
            window.visitorTracker = module2.visitorTracker;
            console.log('✅ 절대 경로 import 성공');
            return module2.visitorTracker;
        }
    } catch (error) {
        console.log('⚠️ 절대 경로 import 실패:', error.message);
    }
    
    try {
        // 방법 3: 전체 URL로 import
        const currentOrigin = window.location.origin;
        const module3 = await import(`${currentOrigin}/scripts/visitor-tracker.js`);
        if (module3.visitorTracker) {
            window.visitorTracker = module3.visitorTracker;
            console.log('✅ 전체 URL import 성공');
            return module3.visitorTracker;
        }
    } catch (error) {
        console.log('⚠️ 전체 URL import 실패:', error.message);
    }
    
    console.error('❌ 모든 import 방법 실패');
    return null;
}

// 4. 수동으로 VisitorTracker 클래스 생성
function createManualVisitorTracker() {
    console.log('🛠️ 수동 방문자 추적기 생성 시도...');
    
    class ManualVisitorTracker {
        constructor() {
            this.sessionId = 'manual_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.startTime = Date.now();
            this.isTracking = false;
            console.log('✅ 수동 방문자 추적기 생성 완료');
        }
        
        async getClientIP() {
            try {
                const response = await fetch('https://api.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch (error) {
                console.error('IP 감지 실패:', error);
                return null;
            }
        }
        
        getDeviceType() {
            const userAgent = navigator.userAgent;
            if (/tablet|ipad/i.test(userAgent)) return 'tablet';
            if (/mobile|phone/i.test(userAgent)) return 'mobile';
            return 'desktop';
        }
        
        getBrowserInfo() {
            const userAgent = navigator.userAgent;
            if (userAgent.includes('Chrome')) return 'Chrome';
            if (userAgent.includes('Firefox')) return 'Firefox';
            if (userAgent.includes('Safari')) return 'Safari';
            if (userAgent.includes('Edge')) return 'Edge';
            return 'Unknown';
        }
        
        async trackVisit() {
            if (this.isTracking) return;
            this.isTracking = true;
            
            console.log('📊 수동 방문 추적 시작...');
            
            const ip = await this.getClientIP();
            const visitData = {
                ip_address: ip,
                user_agent: navigator.userAgent,
                url: window.location.href,
                device_type: this.getDeviceType(),
                browser: this.getBrowserInfo(),
                session_id: this.sessionId,
                created_at: new Date().toISOString()
            };
            
            console.log('방문 데이터:', visitData);
            
            // 실제 Supabase 저장은 원본 스크립트가 로드되면 가능
            console.log('✅ 수동 방문 추적 완료 (데이터 수집만)');
            this.isTracking = false;
        }
    }
    
    const tracker = new ManualVisitorTracker();
    window.visitorTracker = tracker;
    return tracker;
}

// 5. 전체 복구 프로세스 실행
async function recoverVisitorTracker() {
    console.log('🚀 방문자 추적기 복구 프로세스 시작...');
    
    // 1단계: 동적 import 시도
    let tracker = await forceLoadVisitorTracker();
    
    // 2단계: 수동 생성
    if (!tracker) {
        tracker = createManualVisitorTracker();
    }
    
    // 3단계: 테스트
    if (tracker) {
        console.log('🧪 복구된 추적기 테스트...');
        console.log('세션 ID:', tracker.sessionId);
        console.log('디바이스 타입:', tracker.getDeviceType());
        console.log('브라우저:', tracker.getBrowserInfo());
        
        const ip = await tracker.getClientIP();
        console.log('감지된 IP:', ip);
        
        await tracker.trackVisit();
    }
    
    return tracker;
}

// 전역 함수로 등록
window.forceLoadVisitorTracker = forceLoadVisitorTracker;
window.createManualVisitorTracker = createManualVisitorTracker;
window.recoverVisitorTracker = recoverVisitorTracker;

// 즉시 복구 시도
recoverVisitorTracker().then(tracker => {
    if (tracker) {
        console.log('✅ 방문자 추적기 복구 완료!');
        console.log('사용 가능한 명령어:');
        console.log('  - window.visitorTracker.trackVisit()');
        console.log('  - window.visitorTracker.getClientIP()');
        console.log('  - window.recoverVisitorTracker() // 재복구');
    } else {
        console.error('❌ 방문자 추적기 복구 실패');
    }
});

console.log(`
🎯 복구 명령어:
- recoverVisitorTracker()      // 전체 복구 프로세스
- forceLoadVisitorTracker()    // 동적 import 시도
- createManualVisitorTracker() // 수동 생성
`);
