/**
 * TODO-LIST Application - Main Script
 * 
 * Copyright (c) 2025 taeyoon0526
 * Licensed under Shared Source License
 * 
 * This software is provided for viewing and educational purposes only.
 * Modification, redistribution, and commercial use are prohibited.
 * See LICENSE file for full terms and conditions.
 */

// scripts/main.js
import { supabase } from "./api.js";
import { getDDay, getDDayClass, convertToUTCISO, convertFromUTCISO, isValidDate } from "./utils.js";

window.addEventListener("DOMContentLoaded", async () => {
  // MDL 컴포넌트 업그레이드 확인
  if (typeof componentHandler !== 'undefined') {
    componentHandler.upgradeDom();
  }
  
  // 세션 확인
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session && session.user) {
    showTodoApp(session.user.id);
  }
  
  // Auth 상태 변화 리스너 추가 (세션 만료 등 자동 처리)
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[DEBUG] Auth state changed:", event, session);
    
    if (event === 'SIGNED_IN' && session) {
      showTodoApp(session.user.id);
    } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
      // 로그아웃 또는 세션 만료 시 로그인 화면으로 이동
      showAuthSection();
    }
  });
});

// 인증 섹션으로 돌아가기
function showAuthSection() {
  const authSection = document.getElementById("auth-section");
  const todoApp = document.getElementById("todo-app");
  const logoutButton = document.getElementById("logout-button");
  
  authSection.style.display = "block";
  todoApp.classList.remove("todo-app-visible");
  todoApp.classList.add("todo-app-hidden");
  
  // 로그아웃 버튼 숨기기
  if (logoutButton) {
    logoutButton.classList.remove("visible");
  }
}

// 로그인 성공 시 todo-app 표시 및 할 일 목록 불러오기
window.addEventListener("login-success", (e) => {
  const userId = e.detail.user.id;
  console.log("[INFO] 로그인 성공, 메인 화면으로 이동합니다. User ID:", userId);
  showTodoApp(userId);
});

function showTodoApp(userId) {
  const authSection = document.getElementById("auth-section");
  const todoApp = document.getElementById("todo-app");
  const logoutButton = document.getElementById("logout-button");
  
  // 빠른 화면 전환 (성능 최적화)
  authSection.style.display = "none";
  todoApp.classList.remove("todo-app-hidden");
  todoApp.classList.add("todo-app-visible");
  
  // 로그아웃 버튼 표시
  if (logoutButton) {
    logoutButton.classList.add("visible");
  }
  
  // 완료 보기 토글 버튼 이벤트 리스너 설정
  setupCompletedToggle(userId);
  
  // 로그아웃 버튼 이벤트 리스너 설정
  setupLogoutButton();
  
  // 할 일 목록 비동기 로드 (UI 차단 방지)
  loadTodos(userId).catch(error => {
    console.error("할 일 목록 로드 실패:", error);
  });
}

// 공통 에러 처리 함수
function handleAuthError(error) {
  if (!error) return false;
  
  // JWT 토큰 관련 오류 처리
  if (error.code === "401" || error.code === "403" || 
      error.message?.includes("JWT") || 
      error.message?.includes("permission denied") ||
      error.message?.includes("access_token")) {
    console.error("[AUTH ERROR]", error);
    alert("세션이 만료되었거나 권한이 없습니다. 다시 로그인 해주세요.");
    // Supabase 세션 정리 및 로그인 화면으로 이동
    supabase.auth.signOut();
    showAuthSection();
    return true;
  }
  
  // 네트워크 오류
  if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
    console.error("[NETWORK ERROR]", error);
    alert("네트워크 연결을 확인해주세요.");
    return true;
  }
  
  return false;
}

// 디바운싱 유틸리티
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 로딩 상태 표시
function showLoading() {
  const list = document.getElementById("todo-list");
  list.innerHTML = '<li class="todo-item loading-item">로딩 중...</li>';
}

// 필터 상태
let currentFilter = "all";

// 필터 버튼 이벤트 (디바운싱 적용)
const filterBtns = document.querySelectorAll(".filter-btn");
const debouncedFilter = debounce(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    showLoading();
    await loadTodos(session.user.id);
  }
}, 150);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    debouncedFilter();
  });
});

// 할 일 추가 폼 이벤트 (마감일, 우선순위 포함)
const addForm = document.getElementById("todo-add-form");
if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("todo-input");
    const dueInput = document.getElementById("todo-due");
    const prioInput = document.getElementById("todo-priority");
    const title = input.value.trim();
    const dueDateLocal = dueInput.value || null;
    const priority = prioInput.value;
    
    if (!title) return;
    
    // 마감일 유효성 검사
    if (dueDateLocal && !isValidDate(dueDateLocal)) {
      alert("올바른 날짜를 입력해주세요.");
      return;
    }
    
    // 마감일을 UTC ISO 형식으로 변환
    const due_date = dueDateLocal ? convertToUTCISO(dueDateLocal) : null;
    
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert("로그인 후 이용하세요.");
      return;
    }
    
    const { error } = await supabase.from("todos").insert({
      user_id: session.user.id,
      title,
      status: 'pending', // status 필드 사용
      due_date,
      priority,
    });
    
    if (handleAuthError(error)) return;
    if (error) {
      alert("추가 실패: " + error.message);
      return;
    }
    
    input.value = "";
    dueInput.value = "";
    prioInput.value = "중간";
    
    // MDL 텍스트필드 초기화
    const textfields = document.querySelectorAll('.mdl-textfield');
    textfields.forEach(field => {
      if (field.MaterialTextfield) {
        field.MaterialTextfield.checkDirty();
      }
    });
    
    await loadTodos(session.user.id);
  });
}

export async function loadTodos(userId) {
  const todoList = document.getElementById("todo-list");
  
  // 로딩 중이 아닌 경우에만 로딩 표시
  if (!todoList.innerHTML.includes('로딩 중...')) {
    showLoading();
  }
  
  let query = supabase.from("todos").select("*").eq("user_id", userId);
  // 필터 적용
  if (currentFilter === "today") {
    const todayStr = new Date().toISOString().slice(0, 10);
    query = query.gte("due_date", todayStr).lte("due_date", todayStr);
  }
  // 우선순위 정렬(높음>중간>낮음), 마감일 오름차순, 생성일 내림차순
  const { data, error } = await query
    .order("priority", { ascending: true })
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
    
  todoList.innerHTML = "";
  
  if (handleAuthError(error)) return;
  if (error) {
    todoList.innerHTML = '<li class="todo-item error-item">불러오기 실패: ' + error.message + '</li>';
    return;
  }
  
  if (data.length === 0) {
    todoList.innerHTML = '<li class="todo-item empty-item">할 일이 없습니다.</li>';
    return;
  }
  
  for (const todo of data) {
    const li = document.createElement("li");
    li.className = `todo-item priority-${todo.priority || '중간'}`;
    
    // 완료된 항목인지 확인 (status === 'completed')
    const isCompleted = todo.status === 'completed';
    
    // 완료된 항목에 completed 클래스 추가
    if (isCompleted) {
      li.classList.add('completed');
    }
    
    // 체크박스
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = isCompleted;
    checkbox.addEventListener("change", async () => {
      const newStatus = checkbox.checked ? 'completed' : 'pending';
      const { error } = await supabase
        .from("todos")
        .update({ status: newStatus })
        .eq("id", todo.id);
      if (handleAuthError(error)) return;
      await loadTodos(userId);
    });
    li.appendChild(checkbox);
    
    // 콘텐츠 컨테이너
    const content = document.createElement("div");
    content.className = "todo-content";
    
    // 제목
    const titleEl = document.createElement("p");
    titleEl.className = `todo-text${isCompleted ? ' completed' : ''}`;
    titleEl.textContent = todo.title;
    
    // 더블클릭으로 편집 기능 추가
    titleEl.addEventListener("dblclick", () => {
      if (isCompleted) return; // 완료된 항목은 편집 불가
      editTodoInline(titleEl, todo, userId);
    });
    
    content.appendChild(titleEl);
    
    // 메타 정보 (마감일, 우선순위)
    if (todo.due_date || todo.priority) {
      const meta = document.createElement("div");
      meta.className = "todo-meta";
      
      // 마감일 D-Day
      if (todo.due_date) {
        const dday = document.createElement("span");
        const ddayText = getDDay(todo.due_date);
        const ddayClass = getDDayClass(ddayText);
        dday.className = `todo-due ${ddayClass}`;
        dday.textContent = ddayText;
        meta.appendChild(dday);
      }
      
      // 우선순위
      if (todo.priority) {
        const priority = document.createElement("span");
        priority.className = `todo-priority priority-${todo.priority}`;
        priority.textContent = todo.priority;
        meta.appendChild(priority);
      }
      
      content.appendChild(meta);
    }
    
    li.appendChild(content);
    
    // 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.className = "todo-delete";
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", async () => {
      if (confirm("정말 삭제하시겠습니까?")) {
        const { error } = await supabase.from("todos").delete().eq("id", todo.id);
        if (handleAuthError(error)) return;
        await loadTodos(userId);
      }
    });
    li.appendChild(delBtn);
    
    todoList.appendChild(li);
  }
}

// 완료 보기 토글 설정
function setupCompletedToggle(userId) {
  const toggleBtn = document.getElementById("toggle-completed");
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener("click", () => {
    const isShowingCompleted = toggleBtn.getAttribute("data-toggle") === "true";
    const newToggleState = !isShowingCompleted;
    
    toggleBtn.setAttribute("data-toggle", newToggleState.toString());
    toggleBtn.textContent = newToggleState ? "완료 숨기기" : "완료 보기";
    
    // 완료 항목 표시/숨김 처리
    toggleCompletedItems(newToggleState);
  });
}

// 완료된 항목 표시/숨김 토글
function toggleCompletedItems(showCompleted) {
  const todoItems = document.querySelectorAll(".todo-item");
  
  todoItems.forEach(item => {
    const isCompleted = item.classList.contains("completed");
    
    if (isCompleted) {
      if (showCompleted) {
        item.style.display = "flex"; // 완료 항목 보이기
        item.style.opacity = "0.7"; // 약간 흐리게 표시
      } else {
        item.style.display = "none"; // 완료 항목 숨기기
      }
    }
  });
}

// 인라인 편집 기능
async function editTodoInline(titleEl, todo, userId) {
  const originalText = titleEl.textContent;
  
  // 입력 필드 생성
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalText;
  input.className = "todo-edit-input";
  input.style.cssText = `
    width: 100%;
    border: 2px solid #6c63ff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: inherit;
    font-family: inherit;
    background: #fff;
  `;
  
  // 텍스트 요소를 입력 필드로 교체
  titleEl.style.display = "none";
  titleEl.parentNode.insertBefore(input, titleEl);
  input.focus();
  input.select();
  
  // 편집 완료 처리
  const finishEdit = async (save = true) => {
    const newTitle = input.value.trim();
    
    if (save && newTitle && newTitle !== originalText) {
      // 제목 업데이트
      const { error } = await supabase
        .from("todos")
        .update({ title: newTitle })
        .eq("id", todo.id);
        
      if (handleAuthError(error)) {
        input.remove();
        titleEl.style.display = "";
        return;
      }
      
      if (error) {
        alert("수정 실패: " + error.message);
        input.remove();
        titleEl.style.display = "";
        return;
      }
      
      titleEl.textContent = newTitle;
    }
    
    // UI 복원
    input.remove();
    titleEl.style.display = "";
    
    // 변경사항이 있었다면 목록 새로고침
    if (save && newTitle && newTitle !== originalText) {
      await loadTodos(userId);
    }
  };
  
  // 이벤트 리스너
  input.addEventListener("blur", () => finishEdit(true));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishEdit(false);
    }
  });
}

// 로그아웃 버튼 설정
function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-button");
  if (!logoutButton) return;
  
  // 기존 이벤트 리스너 제거 (중복 방지)
  logoutButton.removeEventListener("click", handleLogout);
  
  // 로그아웃 이벤트 리스너 추가
  logoutButton.addEventListener("click", handleLogout);
}

// 로그아웃 처리 함수
async function handleLogout() {
  try {
    console.log("[INFO] 로그아웃 시작");
    
    // 사용자 확인
    if (!confirm("로그아웃 하시겠습니까?")) {
      return;
    }
    
    // Supabase 로그아웃 API 호출
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error("[ERROR] 로그아웃 실패:", error);
      alert("로그아웃 중 오류가 발생했습니다: " + error.message);
      return;
    }
    
    // 로컬 스토리지 및 세션 스토리지 정리
    clearLocalStorage();
    
    console.log("[INFO] 로그아웃 완료");
    
    // 로그인 페이지로 리다이렉트
    showAuthSection();
    
  } catch (error) {
    console.error("[ERROR] 로그아웃 처리 중 예외:", error);
    alert("로그아웃 중 예상치 못한 오류가 발생했습니다.");
  }
}

// 로컬/세션 스토리지 정리
function clearLocalStorage() {
  try {
    // Supabase 관련 스토리지 정리
    const keysToRemove = [];
    
    // localStorage에서 Supabase 관련 키 찾기
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
        keysToRemove.push(key);
      }
    }
    
    // 찾은 키들 삭제
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[INFO] localStorage에서 ${key} 삭제됨`);
    });
    
    // sessionStorage도 정리
    sessionStorage.clear();
    console.log("[INFO] sessionStorage 정리 완료");
    
  } catch (error) {
    console.error("[ERROR] 스토리지 정리 실패:", error);
  }
}

// 전역 함수로 노출 (index.html에서 접근 가능하도록)
window.showTodoApp = showTodoApp;
