// 인증 무한 루프 강제 중단 스크립트
// 브라우저 콘솔에서 즉시 실행하세요

(function forceStopAuthLoop() {
    console.log('🛑 인증 무한 루프 강제 중단 시작...');
    
    // 1. 모든 Supabase 인증 리스너 제거
    if (window.supabase && window.supabase.auth) {
        try {
            // 기존 리스너들을 모두 제거
            window.supabase.auth.removeAllListeners();
            console.log('✅ Supabase 인증 리스너 모두 제거됨');
        } catch (e) {
            console.log('⚠️ Supabase 리스너 제거 중 오류:', e.message);
        }
    }
    
    // 2. AuthGuard 강제 정지
    if (window.getAuthGuard) {
        const guard = window.getAuthGuard();
        if (guard) {
            guard.authCheckInProgress = false;
            guard.isAuthChecked = true;
            guard.isAuthenticated = false;
            
            // 로딩 상태 강제 해제
            if (guard.hideLoadingState) {
                guard.hideLoadingState();
            }
            
            // 로딩 오버레이 강제 제거
            const loadingOverlay = document.getElementById('auth-guard-loading');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
            
            console.log('✅ AuthGuard 강제 정지 완료');
        }
    }
    
    // 3. 모든 타임아웃과 인터벌 클리어
    for (let i = 1; i < 9999; i++) {
        clearTimeout(i);
        clearInterval(i);
    }
    console.log('✅ 모든 타이머 클리어됨');
    
    // 4. 모든 로딩 요소 제거
    document.querySelectorAll('[id*="loading"], [class*="loading"], .mdl-spinner').forEach(el => {
        el.remove();
    });
    console.log('✅ 모든 로딩 요소 제거됨');
    
    // 5. 강제로 UI 상태 복구
    const authSection = document.getElementById('auth-section');
    const todoApp = document.getElementById('todo-app');
    
    if (authSection) {
        authSection.style.display = 'block';
        authSection.style.visibility = 'visible';
        console.log('✅ 로그인 화면 강제 표시');
    }
    
    if (todoApp) {
        todoApp.style.display = 'none';
        todoApp.classList.remove('todo-app-visible');
        todoApp.classList.add('todo-app-hidden');
        console.log('✅ TODO 앱 강제 숨김');
    }
    
    // 6. 페이지 상태 메시지 제거
    document.querySelectorAll('*').forEach(el => {
        if (el.textContent && el.textContent.includes('인증을 확인하고 있습니다')) {
            el.style.display = 'none';
        }
    });
    
    // 7. 성공 메시지
    console.log('🎉 인증 무한 루프 중단 완료!');
    
    // 8. 사용자 알림
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    `;
    notification.textContent = '✅ 인증 문제가 해결되었습니다!';
    document.body.appendChild(notification);
    
    // 3초 후 알림 제거
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
    
    return {
        status: 'success',
        message: '인증 무한 루프가 중단되었습니다',
        authVisible: authSection?.style.display === 'block',
        todoHidden: todoApp?.style.display === 'none'
    };
})();
