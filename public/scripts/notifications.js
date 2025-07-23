/**
 * TODO-LIST Application - Notification System
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/notifications.js
import { getDDay } from "./utils.js";

// 알림 권한 요청
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[NOTIFICATIONS] 이 브라우저는 알림을 지원하지 않습니다.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('[NOTIFICATIONS] 알림 권한이 거부되었습니다.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[NOTIFICATIONS] 알림 권한 요청 결과:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[NOTIFICATIONS] 알림 권한 요청 실패:', error);
    return false;
  }
}

// 할 일 알림 표시
export function showTodoNotification(todo, type = 'reminder') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  let title, body, icon;

  switch (type) {
    case 'dday':
      title = '📅 D-DAY 알림';
      body = `오늘이 "${todo.title}"의 마감일입니다!`;
      icon = '📅';
      break;
    case 'urgent':
      title = '🚨 긴급 알림';
      body = `"${todo.title}"의 마감일이 1시간 남았습니다!`;
      icon = '🚨';
      break;
    case 'tomorrow':
      title = '⏰ 내일 마감 알림';
      body = `"${todo.title}"의 마감일이 내일입니다.`;
      icon = '⏰';
      break;
    default:
      title = '📋 TODO 알림';
      body = `"${todo.title}" 작업을 확인해보세요.`;
      icon = '📋';
  }

  const notification = new Notification(title, {
    body,
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiM2QzYzRkYiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Im05IDExIDMgM0wyMCA0LjMiLz4KPHN2ZyB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgo8cGF0aCBkPSJNMjEgMTUuOTk5IDNiLTggOGE0LjMzNyA0LjMzNyAwIDAgMCA2Ljk3LTMuMTM2TDEzIDhsLTgtOGE0LjMzNyA0LjMzNyAwIDAgMCAzLjEzNiA2Ljk3TDggMTNsOC04Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzYiIGN5PSIzNiIgcj0iMzYiIGZpbGw9IiNGRjQ3NTciLz4KPHN2ZyB4PSIyNCIgeT0iMjQiIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xMiAyMmExMCAxMCAwIDEgMCAwLTIwIDEwIDEwIDAgMCAwIDAgMjB6Ii8+CjxwYXRoIGQ9Im0xMiA4IDQgNGgtMyIvPgo8L3N2Zz4K',
    vibrate: [200, 100, 200],
    tag: `todo-${todo.id}`,
    renotify: false,
    requireInteraction: type === 'urgent' || type === 'dday',
    data: {
      todoId: todo.id,
      type,
      timestamp: Date.now()
    }
  });

  // 알림 클릭 시 앱으로 포커스
  notification.onclick = () => {
    window.focus();
    notification.close();
    
    // 해당 할 일 항목으로 스크롤 (있다면)
    const todoElement = document.querySelector(`[data-todo-id="${todo.id}"]`);
    if (todoElement) {
      todoElement.scrollIntoView({ behavior: 'smooth' });
      todoElement.style.background = '#fff3cd';
      setTimeout(() => {
        todoElement.style.background = '';
      }, 2000);
    }
  };

  // 자동 닫기 (긴급 알림 제외)
  if (type !== 'urgent' && type !== 'dday') {
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  console.log(`[NOTIFICATIONS] ${type} 알림 표시:`, todo.title);
}

// 마감일 체크 및 알림 스케줄링
export function checkDeadlines(todos) {
  if (!todos || todos.length === 0) return;

  const now = new Date();
  const oneHour = 60 * 60 * 1000; // 1시간 (밀리초)
  const oneDay = 24 * 60 * 60 * 1000; // 1일 (밀리초)

  todos.forEach(todo => {
    // 완료된 작업은 알림하지 않음
    if (todo.status === 'completed' || !todo.due_date) return;

    const dueDate = new Date(todo.due_date);
    const timeDiff = dueDate.getTime() - now.getTime();

    // D-Day (오늘이 마감일)
    if (timeDiff >= 0 && timeDiff <= oneDay && timeDiff > oneHour) {
      const todayStr = now.toISOString().slice(0, 10);
      const dueDateStr = dueDate.toISOString().slice(0, 10);
      
      if (todayStr === dueDateStr) {
        showTodoNotification(todo, 'dday');
      }
    }
    
    // 1시간 전 긴급 알림
    else if (timeDiff > 0 && timeDiff <= oneHour) {
      showTodoNotification(todo, 'urgent');
    }
    
    // 내일 마감 알림 (22~26시간 전)
    else if (timeDiff > oneDay && timeDiff <= oneDay + 4 * 60 * 60 * 1000) {
      showTodoNotification(todo, 'tomorrow');
    }
  });
}

// 정기적 알림 체크 시작
export function startNotificationScheduler(checkInterval = 30 * 60 * 1000) { // 30분마다
  console.log('[NOTIFICATIONS] 알림 스케줄러 시작');
  
  // 즉시 한 번 체크
  window.dispatchEvent(new CustomEvent('check-deadlines'));
  
  // 정기적 체크
  return setInterval(() => {
    window.dispatchEvent(new CustomEvent('check-deadlines'));
  }, checkInterval);
}

// 알림 스케줄러 중지
export function stopNotificationScheduler(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[NOTIFICATIONS] 알림 스케줄러 중지');
  }
}

// 브라우저 알림 설정 상태 확인
export function getNotificationStatus() {
  if (!('Notification' in window)) {
    return { supported: false, permission: 'not-supported' };
  }

  return {
    supported: true,
    permission: Notification.permission,
    maxActions: Notification.maxActions || 0
  };
}

// 테스트 알림 (설정 확인용)
export function showTestNotification() {
  const testTodo = {
    id: 'test',
    title: '테스트 할 일',
    due_date: new Date().toISOString()
  };
  
  showTodoNotification(testTodo, 'reminder');
}
