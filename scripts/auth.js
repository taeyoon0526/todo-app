// scripts/auth.js
import { supabase } from "./api.js";

// 회원가입 함수
export async function signUpWithEmail(email, password, username) {
  // Supabase Auth로 회원가입
  const { user, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  return { user, error };
}

// 회원가입 폼 이벤트 리스너
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const username = document.getElementById("signup-username").value;
    const password = document.getElementById("signup-password").value;
    const errorDiv = document.getElementById("signup-error");
    errorDiv.textContent = "";
    if (!email || !username || !password) {
      errorDiv.textContent = "모든 항목을 입력하세요.";
      return;
    }
    if (password.length < 8) {
      errorDiv.textContent = "비밀번호는 8자 이상이어야 합니다.";
      return;
    }
    const { user, error } = await signUpWithEmail(email, password, username);
    if (error) {
      errorDiv.textContent = error.message;
    } else {
      errorDiv.style.color = "green";
      errorDiv.textContent = "회원가입 성공! 이메일 인증 후 로그인하세요.";
      signupForm.reset();
    }
  });
}
