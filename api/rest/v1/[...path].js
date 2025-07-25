// Vercel Serverless Function for Supabase Proxy
const supabaseUrl = 'https://eybuksswxwbvpuyhvocb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // URL 파싱
    const urlPath = req.url.replace('/api/rest/v1/', '');
    const [path, queryString] = urlPath.split('?');
    
    // Supabase API URL 구성
    let supabaseApiUrl = `${supabaseUrl}/rest/v1/${path}`;
    if (queryString) {
      supabaseApiUrl += `?${queryString}`;
    }

    console.log('Proxying to:', supabaseApiUrl);

    // 요청 헤더 구성
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    };

    // Prefer 헤더 처리 (RPC 호출용)
    if (req.headers.prefer) {
      headers['Prefer'] = req.headers.prefer;
    }

    // 요청 본문 처리
    let body = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = JSON.stringify(req.body);
    }

    // Supabase로 프록시 요청
    const response = await fetch(supabaseApiUrl, {
      method: req.method,
      headers,
      body,
    });

    if (!response.ok) {
      console.error('Supabase API Error:', response.status, response.statusText);
    }

    const data = await response.text();
    console.log('Response:', response.status, data.substring(0, 200));
    
    // 응답 반환
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(data);

  } catch (error) {
    console.error('Handler Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',  
      message: error.message 
    });
  }
}
