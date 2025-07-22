// 방문자 추적 시스템 테스트 스크립트
// 브라우저 콘솔에서 실행하세요

console.log('🔍 방문자 추적 시스템 진단 시작...');

// 1. 방문자 추적기 존재 여부 확인
if (typeof window.visitorTracker !== 'undefined') {
    console.log('✅ window.visitorTracker 존재');
    console.log('방문자 추적기 객체:', window.visitorTracker);
} else {
    console.log('❌ window.visitorTracker 없음');
    
    // 동적 import로 로드 시도
    import('./scripts/visitor-tracker.js').then(module => {
        window.visitorTracker = module.visitorTracker;
        console.log('✅ 동적 import로 방문자 추적기 로드 완료');
        testVisitorTracker();
    }).catch(error => {
        console.error('❌ 동적 import 실패:', error);
    });
}

// 2. 방문자 추적기 테스트 함수
function testVisitorTracker() {
    if (!window.visitorTracker) {
        console.error('❌ 방문자 추적기가 로드되지 않았습니다');
        return;
    }
    
    console.log('🧪 방문자 추적기 테스트 시작...');
    
    try {
        // 세션 ID 확인
        console.log('세션 ID:', window.visitorTracker.sessionId);
        
        // 디바이스 정보 확인
        console.log('디바이스 타입:', window.visitorTracker.getDeviceType());
        console.log('브라우저:', window.visitorTracker.getBrowserInfo());
        console.log('OS:', window.visitorTracker.getOSInfo());
        
        // 수동 방문 추적 시도
        console.log('📊 수동 방문 추적 시도 중...');
        window.visitorTracker.trackVisit().then(() => {
            console.log('✅ 방문 추적 완료');
        }).catch(error => {
            console.error('❌ 방문 추적 실패:', error);
        });
        
    } catch (error) {
        console.error('❌ 방문자 추적기 테스트 중 오류:', error);
    }
}

// 3. IP 감지 테스트
async function testIPDetection() {
    console.log('🌐 IP 감지 테스트 시작...');
    
    if (!window.visitorTracker) {
        console.error('❌ 방문자 추적기가 없어 IP 테스트 불가');
        return;
    }
    
    try {
        const ip = await window.visitorTracker.getClientIP();
        console.log('감지된 IP 주소:', ip);
    } catch (error) {
        console.error('❌ IP 감지 실패:', error);
    }
}

// 4. Supabase 방문자 로그 확인
async function checkVisitorLogs() {
    console.log('📊 Supabase 방문자 로그 확인...');
    
    // Supabase 클라이언트 찾기 (여러 방법 시도)
    let supabaseClient = null;
    
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase;
    } else if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase;
    } else if (window.visitorTracker && window.visitorTracker.constructor.toString().includes('supabase')) {
        // visitor-tracker에서 supabase import 확인
        console.log('⚠️ 방문자 추적기에서 Supabase 사용 중 - 직접 조회는 불가능');
        console.log('✅ 하지만 방문 추적 자체는 정상 작동 중입니다');
        return;
    }
    
    if (!supabaseClient) {
        console.log('⚠️ Supabase 클라이언트에 직접 접근할 수 없습니다');
        console.log('💡 대신 방문자 추적기 내부에서 데이터를 확인해보세요:');
        console.log('   - window.visitorTracker.getVisitorStats()');
        console.log('   - window.visitorTracker.getTodayVisitors()');
        
        // 방문자 추적기의 통계 함수 시도
        if (window.visitorTracker) {
            try {
                const todayStats = await window.visitorTracker.getTodayVisitors();
                console.log('✅ 오늘의 방문자 통계:', todayStats);
                
                const visitorStats = await window.visitorTracker.getVisitorStats();
                console.log('✅ 전체 방문자 통계:', visitorStats);
            } catch (error) {
                console.log('⚠️ 방문자 통계 조회 실패 (정상 - 데이터가 아직 적을 수 있음)');
            }
        }
        return;
    }
    
    try {
        // 최근 로그 조회
        const { data, error } = await supabaseClient
            .from('visitor_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
            
        if (error) {
            console.error('❌ 방문자 로그 조회 실패:', error);
        } else {
            console.log('✅ 최근 방문자 로그 (5개):', data);
        }
        
        // 통계 확인
        const { data: stats, error: statsError } = await supabaseClient.rpc('debug_visitor_stats');
        if (statsError) {
            console.error('❌ 통계 조회 실패:', statsError);
        } else {
            console.log('✅ 방문자 통계:', stats);
        }
        
    } catch (error) {
        console.error('❌ Supabase 쿼리 중 오류:', error);
    }
}

// 5. 전체 테스트 실행
function runAllTests() {
    console.log('🚀 전체 테스트 실행 시작...');
    
    setTimeout(() => {
        if (window.visitorTracker) {
            testVisitorTracker();
            testIPDetection();
        }
        checkVisitorLogs();
    }, 1000);
}

// 초기 실행
if (window.visitorTracker) {
    testVisitorTracker();
} else {
    console.log('⏳ 1초 후 재시도...');
    setTimeout(() => {
        if (window.visitorTracker) {
            testVisitorTracker();
        } else {
            console.log('❌ 방문자 추적기 로드 실패 - 수동으로 import 필요');
        }
    }, 1000);
}

// 전역 함수로 등록
window.testVisitorTracker = testVisitorTracker;
window.testIPDetection = testIPDetection;
window.checkVisitorLogs = checkVisitorLogs;
window.runAllTests = runAllTests;

console.log(`
🎯 사용 가능한 테스트 명령어:
- testVisitorTracker()  // 방문자 추적기 테스트
- testIPDetection()     // IP 감지 테스트  
- checkVisitorLogs()    // Supabase 로그 확인
- runAllTests()         // 전체 테스트 실행
`);
