// Vercel Serverless Function for Supabase RPC calls
const supabaseUrl = 'https://eybuksswxwbvpuyhvocb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw';

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 함수명 추출
    const { func } = req.query;
    if (!func) {
      return res.status(400).json({ error: 'Function name required' });
    }

    console.log('RPC Function:', func, 'Params:', req.body);

    // Supabase RPC API URL
    const supabaseApiUrl = `${supabaseUrl}/rest/v1/rpc/${func}`;

    // 요청 헤더 구성
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };

    // Supabase RPC 호출
    const response = await fetch(supabaseApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body || {}),
    });

    console.log('RPC Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RPC Error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'RPC call failed',
        details: errorText
      });
    }

    const data = await response.text();
    console.log('RPC Response:', data);
    
    // 응답 반환
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(data);

  } catch (error) {
    console.error('RPC Handler Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',  
      message: error.message 
    });
  }
}
