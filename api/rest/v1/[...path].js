// Vercel Edge Function for Supabase Proxy
export const config = {
  runtime: 'edge'
};

const supabaseUrl = 'https://eybuksswxwbvpuyhvocb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw';

export default async function handler(request) {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/rest/v1/', '');

    // Supabase API URL 구성
    let supabaseApiUrl = `${supabaseUrl}/rest/v1/${path}`;
    
    // 쿼리 파라미터 추가
    if (url.search) {
      supabaseApiUrl += url.search;
    }

    // 요청 헤더 구성
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // 요청 본문 처리
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    // Supabase로 프록시 요청
    const response = await fetch(supabaseApiUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Handler Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',  
      message: error.message 
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}
