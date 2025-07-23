// Vercel Serverless Function for Supabase Proxy
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eybuksswxwbvpuyhvocb.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw';

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const path = pathname.replace('/api/rest/v1/', '');

    // RPC 함수 호출
    if (path.startsWith('rpc/')) {
      const functionName = path.replace('rpc/', '');
      const params = req.body || {};

      console.log(`🔧 RPC Call: ${functionName}`, params);

      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        console.error('RPC Error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json(data);
    }

    // 테이블 쿼리
    const tableName = path.split('?')[0];
    const query = new URLSearchParams(req.url.split('?')[1] || '');

    console.log(`📊 Table Query: ${tableName}`, Object.fromEntries(query));

    let supabaseQuery = supabase.from(tableName);

    // SELECT 파라미터
    const select = query.get('select') || '*';
    supabaseQuery = supabaseQuery.select(select);

    // 필터링
    for (const [key, value] of query.entries()) {
      if (key === 'select' || key === 'limit' || key === 'order') continue;

      if (value.startsWith('gte.')) {
        supabaseQuery = supabaseQuery.gte(key, value.replace('gte.', ''));
      } else if (value.startsWith('lt.')) {
        supabaseQuery = supabaseQuery.lt(key, value.replace('lt.', ''));
      } else if (value.startsWith('not.is.')) {
        supabaseQuery = supabaseQuery.not(key, 'is', value.replace('not.is.', ''));
      } else {
        supabaseQuery = supabaseQuery.eq(key, value);
      }
    }

    // 정렬
    const order = query.get('order');
    if (order) {
      const [column, direction] = order.split('.');
      supabaseQuery = supabaseQuery.order(column, { ascending: direction === 'asc' });
    }

    // 제한
    const limit = query.get('limit');
    if (limit) {
      supabaseQuery = supabaseQuery.limit(parseInt(limit));
    }

    // POST 요청 (INSERT)
    if (req.method === 'POST' && req.body) {
      const { data, error } = await supabaseQuery.insert(req.body).select();
      
      if (error) {
        console.error('Insert Error:', error);
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json(data);
    }

    // GET 요청 (SELECT)
    const { data, error } = await supabaseQuery;

    if (error) {
      console.error('Select Error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Handler Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',  
      message: error.message 
    });
  }
}
