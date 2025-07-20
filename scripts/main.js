// scripts/main.js
import { supabase } from "./api.js";

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
  
  authSection.style.display = "block";
  todoApp.classList.remove("todo-app-visible");
  todoApp.classList.add("todo-app-hidden");
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
  
  // 빠른 화면 전환 (성능 최적화)
  authSection.style.display = "none";
  todoApp.classList.remove("todo-app-hidden");
  todoApp.classList.add("todo-app-visible");
  
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
    const due_date = dueInput.value || null;
    const priority = prioInput.value;
    if (!title) return;
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
      is_done: false,
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

// D-Day 계산 함수
function getDDay(due) {
  if (!due) return "";
  const today = new Date();
  const dueDate = new Date(due);
  const diff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
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
    
    // 체크박스
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "todo-checkbox";
    checkbox.checked = !!todo.is_done;
    checkbox.addEventListener("change", async () => {
      const { error } = await supabase
        .from("todos")
        .update({ is_done: !todo.is_done })
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
    titleEl.className = `todo-text${todo.is_done ? ' completed' : ''}`;
    titleEl.textContent = todo.title;
    content.appendChild(titleEl);
    
    // 메타 정보 (마감일, 우선순위)
    if (todo.due_date || todo.priority) {
      const meta = document.createElement("div");
      meta.className = "todo-meta";
      
      // 마감일 D-Day
      if (todo.due_date) {
        const dday = document.createElement("span");
        const ddayText = getDDay(todo.due_date);
        dday.className = `todo-due${ddayText.includes('+') ? ' overdue' : ''}`;
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
