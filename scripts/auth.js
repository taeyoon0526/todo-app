// scripts/auth.js
import { supabase } from "./api.js";

export async function signUpHandler(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log("[DEBUG] signUp result", data, error);
    if (error) {
      alert("회원가입 실패: " + error.message);
    } else {
      alert("회원가입 성공! 이메일 인증 후 로그인하세요.");
    }
  } catch (e) {
    console.error(e);
    alert("예상치 못한 오류가 발생했습니다.");
  }
}

export async function signInHandler(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log("[DEBUG] signIn result", data, error);
    if (error) {
      alert("로그인 실패: " + error.message);
    } else {
      alert("로그인 성공!");
      // 로그인 성공 시 커스텀 이벤트 발생
      window.dispatchEvent(
        new CustomEvent("login-success", { detail: { user: data.user } })
      );
    }
  } catch (e) {
    console.error(e);
    alert("예상치 못한 오류가 발생했습니다.");
  }
}

// 폼 이벤트 연결 (index.html에서 type="module"로 import 필요)
