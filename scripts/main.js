// scripts/main.js
import { supabase } from "./api.js";

window.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session && session.user) {
    showTodoApp(session.user.id);
  }
});

// 로그인 성공 시 todo-app 표시 및 할 일 목록 불러오기
window.addEventListener("login-success", (e) => {
  const userId = e.detail.user.id;
  showTodoApp(userId);
});

function showTodoApp(userId) {
  document.getElementById("todo-app").style.display = "";
  loadTodos(userId);
}

// 공통 에러 처리 함수
function handleAuthError(error) {
  if (!error) return false;
  if (error.code === "401" || error.code === "403") {
    alert("세션이 만료되었거나 권한이 없습니다. 다시 로그인 해주세요.");
    location.reload();
    return true;
  }
  return false;
}

// 필터 상태
let currentFilter = "all";

// 필터 버튼 이벤트
const filterBtns = document.querySelectorAll(".filter-btn");
filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    // 현재 로그인한 사용자 정보로 목록 갱신
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) loadTodos(session.user.id);
    });
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

// 우선순위 컬러
function getPriorityColor(priority) {
  if (priority === "높음") return "#ff6b81";
  if (priority === "중간") return "#6c63ff";
  return "#5ad1e6";
}

export async function loadTodos(userId) {
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
  const list = document.getElementById("todo-list");
  list.innerHTML = "";
  if (handleAuthError(error)) return;
  if (error) {
    list.innerHTML = "<li>불러오기 실패: " + error.message + "</li>";
    return;
  }
  if (data.length === 0) {
    list.innerHTML = "<li>할 일이 없습니다.</li>";
    return;
  }
  for (const todo of data) {
    const li = document.createElement("li");
    // 체크박스
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
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
    // 우선순위 태그
    const prio = document.createElement("span");
    prio.textContent = todo.priority || "중간";
    prio.style.background = getPriorityColor(todo.priority);
    prio.style.color = "#fff";
    prio.style.fontSize = "0.85em";
    prio.style.fontWeight = "bold";
    prio.style.borderRadius = "6px";
    prio.style.padding = "2px 8px";
    prio.style.marginRight = "8px";
    li.appendChild(prio);
    // 제목
    const span = document.createElement("span");
    span.textContent = todo.title;
    if (todo.is_done) {
      span.style.textDecoration = "line-through";
      span.style.color = "#aaa";
    }
    li.appendChild(span);
    // 마감일 D-Day
    if (todo.due_date) {
      const dday = document.createElement("span");
      dday.textContent = " " + getDDay(todo.due_date);
      dday.style.marginLeft = "10px";
      dday.style.fontSize = "0.92em";
      dday.style.color = "#6c63ff";
      li.appendChild(dday);
    }
    // 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.style.marginLeft = "8px";
    delBtn.addEventListener("click", async () => {
      const { error } = await supabase.from("todos").delete().eq("id", todo.id);
      if (handleAuthError(error)) return;
      await loadTodos(userId);
    });
    li.appendChild(delBtn);
    list.appendChild(li);
  }
}
