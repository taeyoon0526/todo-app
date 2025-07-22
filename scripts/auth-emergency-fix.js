// 인증 무한 로딩 긴급 복구 스크립트
// 브라우저 콘솔에서 실행하세요

(function() {
    console.log('🔧 인증 시스템 긴급 복구 시작...');
    
    // 1. 기존 로딩 오버레이 강제 제거
    const loadingOverlay = document.getElementById('auth-guard-loading');
    if (loadingOverlay) {
        loadingOverlay.remove();
        console.log('✅ 기존 로딩 오버레이 제거됨');
    }
    
    // 2. 모든 로딩 관련 요소 제거
    document.querySelectorAll('[id*="loading"], [class*="loading"]').forEach(el => {
        if (el.style.display !== 'none') {
            el.style.display = 'none';
        }
    });
    
    // 3. 강제로 로그인 화면 표시
    const authSection = document.getElementById('auth-section');
    const todoApp = document.getElementById('todo-app');
    
    if (authSection) {
        authSection.style.display = 'block';
        console.log('✅ 인증 섹션 강제 표시');
    }
    
    if (todoApp) {
        todoApp.style.display = 'none';
        todoApp.classList.remove('todo-app-visible');
        todoApp.classList.add('todo-app-hidden');
        console.log('✅ TODO 앱 강제 숨김');
    }
    
    // 4. AuthGuard 상태 강제 리셋
    if (window.getAuthGuard) {
        const authGuard = window.getAuthGuard();
        if (authGuard) {
            authGuard.authCheckInProgress = false;
            authGuard.isAuthChecked = true;
            authGuard.isAuthenticated = false;
            console.log('✅ AuthGuard 상태 리셋 완료');
        }
    }
    
    // 5. 기존 타임아웃들 모두 클리어
    for (let i = 1; i < 999; i++) {
        clearTimeout(i);
        clearInterval(i);
    }
    console.log('✅ 모든 타임아웃/인터벌 클리어됨');
    
    // 6. 토스트 메시지 표시
    if (window.ToastManager && window.ToastManager.show) {
        window.ToastManager.show(
            '인증 시스템이 복구되었습니다. 다시 로그인해주세요.', 
            'success', 
            5000
        );
    }
    
    console.log('🎉 인증 시스템 긴급 복구 완료!');
    console.log('💡 이제 로그인을 다시 시도해보세요.');
    
    return {
        status: 'success',
        message: '인증 시스템 복구 완료',
        authSectionVisible: authSection?.style.display === 'block',
        todoAppHidden: todoApp?.style.display === 'none'
    };
})();
