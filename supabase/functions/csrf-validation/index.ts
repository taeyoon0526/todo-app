/**
 * TODO-LIST Application - CSRF Validation Edge Function
 * 
 * Supabase Edge Function for server-side CSRF token validation
 * T-034 구현의 일부
 * 
 * Copyright (c) 2025 taeyoon0526
 */

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface TodoData {
  title: string;
  description?: string | null;
  priority?: string;
  due_date?: string | null;
  user_id?: string;
  completed?: boolean;
  display_order?: number;
}

interface UpdateData {
  title?: string;
  completed?: boolean;
  priority?: string;
  display_order?: number;
}

interface RequestData {
  id?: string;
  title?: string;
  description?: string;
  priority?: string;
  due_date?: string;
  completed?: boolean;
  display_order?: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// CSRF 토큰 검증 함수
function validateCSRFToken(cookieToken, headerToken) {
  // 두 토큰이 모두 존재하고 일치하는지 확인
  if (!cookieToken || !headerToken) {
    return false;
  }

  // 토큰 형식 검증 (32바이트 16진수)
  const tokenRegex = /^[a-f0-9]{64}$/i;
  if (!tokenRegex.test(cookieToken) || !tokenRegex.test(headerToken)) {
    return false;
  }

  // 토큰 일치 확인
  return cookieToken === headerToken;
}

// 쿠키에서 CSRF 토큰 추출
function extractCSRFTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === '__csrf_token') {
      return value;
    }
  }
  return null;
}

// 요청 속도 제한 검사 (간단한 메모리 기반)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1분
const RATE_LIMIT_MAX_REQUESTS = 100; // 분당 최대 100회

function checkRateLimit(clientId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(clientId)) {
    rateLimitMap.set(clientId, []);
  }

  const requests = rateLimitMap.get(clientId);

  // 윈도우 밖의 요청들 제거
  const validRequests = requests.filter(timestamp => timestamp > windowStart);
  rateLimitMap.set(clientId, validRequests);

  // 요청 수 확인
  if (validRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // 현재 요청 추가
  validRequests.push(now);
  return true;
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 클라이언트 IP 추출 (Cloudflare를 통한 경우)
    const clientIP = req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for') ||
      'unknown';

    // 속도 제한 검사
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // POST 요청만 허용
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 헤더에서 CSRF 토큰 추출
    const csrfHeaderToken = req.headers.get('x-csrf-token');
    const cookieHeader = req.headers.get('cookie');
    const csrfCookieToken = extractCSRFTokenFromCookie(cookieHeader);

    // CSRF 토큰 검증
    if (!validateCSRFToken(csrfCookieToken, csrfHeaderToken)) {
      console.error('CSRF validation failed:', {
        hasHeaderToken: !!csrfHeaderToken,
        hasCookieToken: !!csrfCookieToken,
        clientIP
      });

      return new Response(
        JSON.stringify({
          error: 'CSRF validation failed',
          message: 'CSRF 토큰 검증에 실패했습니다.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Authorization 헤더 확인
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Authorization required',
          message: '인증이 필요합니다.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // JWT 토큰 검증
    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user.user) {
      return new Response(
        JSON.stringify({
          error: 'Invalid token',
          message: '유효하지 않은 인증 토큰입니다.'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 요청 본문 파싱
    const requestBody = await req.json();

    // 요청 유형별 처리
    const { action, data } = requestBody;

    let result;

    switch (action) {
      case 'create_todo':
        result = await handleCreateTodo(supabase, user.user.id, data);
        break;
      case 'update_todo':
        result = await handleUpdateTodo(supabase, user.user.id, data);
        break;
      case 'delete_todo':
        result = await handleDeleteTodo(supabase, user.user.id, data);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }

    // 성공 응답
    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        csrf_token: csrfHeaderToken // 토큰 재확인용
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: '서버 내부 오류가 발생했습니다.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// TODO 생성 핸들러
async function handleCreateTodo(supabase: any, userId: string, data: RequestData) {
  // 입력 검증
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Invalid title');
  }

  if (data.title.length > 500) {
    throw new Error('Title too long');
  }

  // 악성 콘텐츠 검사
  if (data.title.match(/<script|javascript:|on\w+=/i)) {
    throw new Error('Potentially malicious content detected');
  }

  const todoData: TodoData = {
    title: data.title.trim(),
    description: data.description || null,
    priority: ['low', 'medium', 'high'].includes(data.priority || '') ? data.priority : 'medium',
    due_date: data.due_date || null,
    user_id: userId,
    completed: false,
    display_order: data.display_order || 0
  };

  const { data: result, error } = await supabase
    .from('todos')
    .insert(todoData)
    .select();

  if (error) {
    throw error;
  }

  return result;
}

// TODO 업데이트 핸들러
async function handleUpdateTodo(supabase: any, userId: string, data: RequestData) {
  if (!data.id) {
    throw new Error('Todo ID required');
  }

  // UUID 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.id)) {
    throw new Error('Invalid todo ID format');
  }

  const updateData: UpdateData = {};

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.length > 500) {
      throw new Error('Invalid title');
    }
    if (data.title.match(/<script|javascript:|on\w+=/i)) {
      throw new Error('Potentially malicious content detected');
    }
    updateData.title = data.title.trim();
  }

  if (data.completed !== undefined) {
    updateData.completed = Boolean(data.completed);
  }

  if (data.priority !== undefined) {
    if (!['low', 'medium', 'high'].includes(data.priority)) {
      throw new Error('Invalid priority');
    }
    updateData.priority = data.priority;
  }

  if (data.display_order !== undefined) {
    const order = parseInt(data.display_order.toString(), 10);
    if (isNaN(order) || order < 0) {
      throw new Error('Invalid display order');
    }
    updateData.display_order = order;
  }

  const { data: result, error } = await supabase
    .from('todos')
    .update(updateData)
    .eq('id', data.id)
    .eq('user_id', userId) // 소유자 확인
    .select();

  if (error) {
    throw error;
  }

  return result;
}

// TODO 삭제 핸들러
async function handleDeleteTodo(supabase: any, userId: string, data: RequestData) {
  if (!data.id) {
    throw new Error('Todo ID required');
  }

  // UUID 형식 검증
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.id)) {
    throw new Error('Invalid todo ID format');
  }

  const { data: result, error } = await supabase
    .from('todos')
    .delete()
    .eq('id', data.id)
    .eq('user_id', userId); // 소유자 확인

  if (error) {
    throw error;
  }

  return result;
}
