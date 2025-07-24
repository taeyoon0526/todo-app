// 웹사이트 방문자 IP 추적 모듈
// scripts/visitor-tracker.js

import { supabase } from './api.js';

class VisitorTracker {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.isTracking = false;
    }

    // 고유한 세션 ID 생성
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 방문자 정보 수집 (IP 감지 개선)
    async collectVisitorInfo() {
        try {
            const visitorInfo = {
                ip_address: await this.getClientIP(), // 클라이언트 IP 획득 시도
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
                is_first_visit: this.isFirstVisit()
            };

            // 로그인한 사용자라면 user_id 추가
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                visitorInfo.user_id = user.id;
            }

            return visitorInfo;
        } catch (error) {
            console.error('방문자 정보 수집 실패:', error);
            return null;
        }
    }

    // 클라이언트 IP 주소 획득 (여러 방법 시도)
    async getClientIP() {
        try {
            // 방법 1: ipify API 사용
            const response1 = await fetch('https://api.ipify.org?format=json');
            if (response1.ok) {
                const data = await response1.json();
                console.log('[VISITOR_TRACKER] IP 감지 성공 (ipify):', data.ip);
                return data.ip;
            }
        } catch (error) {
            console.warn('[VISITOR_TRACKER] ipify API 실패:', error);
        }

        try {
            // 방법 2: ip-api.com 사용
            const response2 = await fetch('https://ip-api.com/json/');
            if (response2.ok) {
                const data = await response2.json();
                console.log('[VISITOR_TRACKER] IP 감지 성공 (ip-api):', data.query);
                return data.query;
            }
        } catch (error) {
            console.warn('[VISITOR_TRACKER] ip-api 실패:', error);
        }

        try {
            // 방법 3: httpbin 사용
            const response3 = await fetch('https://httpbin.org/ip');
            if (response3.ok) {
                const data = await response3.json();
                console.log('[VISITOR_TRACKER] IP 감지 성공 (httpbin):', data.origin);
                return data.origin.split(',')[0].trim();
            }
        } catch (error) {
            console.warn('[VISITOR_TRACKER] httpbin 실패:', error);
        }

        // 모든 방법 실패 시 null 반환 (서버에서 헤더로 감지 시도)
        console.warn('[VISITOR_TRACKER] 클라이언트 IP 감지 실패, 서버 감지에 의존');
        return null;
    }

    // 디바이스 타입 감지
    getDeviceType() {
        const userAgent = navigator.userAgent;
        
        if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
            return 'tablet';
        } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
            return 'mobile';
        } else {
            return 'desktop';
        }
    }

    // 브라우저 정보 감지
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        if (userAgent.includes('Opera')) return 'Opera';
        
        return 'Unknown';
    }

    // 운영체제 정보 감지
    getOSInfo() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Windows')) return 'Windows';
        if (userAgent.includes('Mac OS')) return 'macOS';
        if (userAgent.includes('Linux')) return 'Linux';
        if (userAgent.includes('Android')) return 'Android';
        if (userAgent.includes('iOS')) return 'iOS';
        
        return 'Unknown';
    }

    // 최초 방문 여부 확인
    isFirstVisit() {
        const hasVisited = localStorage.getItem('has_visited_todo_app');
        if (!hasVisited) {
            localStorage.setItem('has_visited_todo_app', 'true');
            return true;
        }
        return false;
    }

    // Supabase에 방문 로그 저장 (IP 포함 개선 버전)
    async trackVisit() {
        if (this.isTracking) return; // 중복 방지
        
        try {
            this.isTracking = true;
            
            const visitorInfo = await this.collectVisitorInfo();
            if (!visitorInfo) return;

            console.log('[VISITOR_TRACKER] 방문 추적 시도:', visitorInfo);

            // Supabase에 삽입 (IP 주소 포함)
            const { data, error } = await supabase
                .from('visitor_logs')
                .insert([{
                    ip_address: visitorInfo.ip_address, // 클라이언트에서 획득한 IP
                    user_id: visitorInfo.user_id,
                    user_agent: visitorInfo.user_agent,
                    referer: visitorInfo.referer,
                    url: visitorInfo.url,
                    screen_resolution: visitorInfo.screen_resolution,
                    language: visitorInfo.language,
                    timezone: visitorInfo.timezone,
                    device_type: visitorInfo.device_type,
                    browser: visitorInfo.browser,
                    os: visitorInfo.os,
                    session_id: visitorInfo.session_id,
                    is_first_visit: visitorInfo.is_first_visit
                }])
                .select();

            if (error) {
                console.error('[VISITOR_TRACKER] 방문 추적 실패:', error);
                return;
            }

            console.log('[VISITOR_TRACKER] 방문 추적 성공:', data);
            
            // 성공한 경우 IP 주소 로깅
            if (data && data[0] && data[0].ip_address) {
                console.log('[VISITOR_TRACKER] 저장된 IP 주소:', data[0].ip_address);
            }
            
            // 페이지 언로드 시 방문 시간 업데이트 준비
            this.setupVisitDurationTracking();
            
        } catch (error) {
            console.error('[VISITOR_TRACKER] 방문 추적 중 오류:', error);
        }
    }

    // 방문 시간 추적 설정
    setupVisitDurationTracking() {
        const trackDuration = async () => {
            const duration = Math.floor((Date.now() - this.startTime) / 1000);
            
            try {
                await supabase
                    .from('visitor_logs')
                    .update({ visit_duration: duration })
                    .eq('session_id', this.sessionId)
                    .order('created_at', { ascending: false })
                    .limit(1);
                    
            } catch (error) {
                console.error('방문 시간 업데이트 실패:', error);
            }
        };

        // 페이지 언로드 시 방문 시간 기록
        window.addEventListener('beforeunload', trackDuration);
        
        // 페이지 숨김 시에도 기록 (모바일 대응)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                trackDuration();
            }
        });

        // 주기적으로 방문 시간 업데이트 (5분마다)
        setInterval(trackDuration, 5 * 60 * 1000);
    }

    // 페이지 뷰 증가
    async incrementPageView() {
        try {
            await supabase
                .from('visitor_logs')
                .update({ 
                    page_views: supabase.sql`page_views + 1`,
                    url: window.location.href 
                })
                .eq('session_id', this.sessionId)
                .order('created_at', { ascending: false })
                .limit(1);
                
        } catch (error) {
            console.error('페이지 뷰 업데이트 실패:', error);
        }
    }

    // 실시간 방문자 통계 조회
    async getVisitorStats() {
        try {
            const { data, error } = await supabase
                .from('visitor_stats')
                .select('*')
                .order('visit_count', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
            
        } catch (error) {
            console.error('방문자 통계 조회 실패:', error);
            return [];
        }
    }

    // 오늘의 방문자 수 조회
    async getTodayVisitors() {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const { data, error } = await supabase
                .from('daily_visitor_stats')
                .select('*')
                .eq('visit_date', today)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || { unique_visitors: 0, total_visits: 0 };
            
        } catch (error) {
            console.error('오늘 방문자 수 조회 실패:', error);
            return { unique_visitors: 0, total_visits: 0 };
        }
    }
}

// 전역 인스턴스 생성
export const visitorTracker = new VisitorTracker();

// 전역 접근을 위해 window 객체에도 등록
if (typeof window !== 'undefined') {
    window.visitorTracker = visitorTracker;
    console.log('[VISITOR_TRACKER] 전역 window.visitorTracker 등록 완료');
}

// 페이지 로드 시 자동 추적 시작
document.addEventListener('DOMContentLoaded', () => {
    console.log('[VISITOR_TRACKER] DOM 로드 완료, 방문 추적 시작');
    visitorTracker.trackVisit();
});

// 페이지 변경 시 페이지 뷰 증가 (SPA 대응)
let currentUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        visitorTracker.incrementPageView();
    }
}, 1000);

export default VisitorTracker;
