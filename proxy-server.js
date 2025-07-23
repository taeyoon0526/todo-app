const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Supabase 설정
const SUPABASE_URL = 'https://eybuksswxwbvpuyhvocb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5YnVrc3N3eHdidnB1eWh2b2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTY1ODQsImV4cCI6MjA2ODU3MjU4NH0.QzxQF5sP0ns1cSpZ6cBjN2UK8B-2ccyhZC0Hn_LR9hw';

const PORT = 3001;

// MIME 타입 맵
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

function proxyRequest(req, res, targetUrl) {
    const parsedUrl = url.parse(targetUrl);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.path + (req.url.includes('?') ? '&' + req.url.split('?')[1] : ''),
        method: req.method,
        headers: {
            ...req.headers,
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'host': parsedUrl.hostname
        }
    };

    const proxy = (parsedUrl.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
        // CORS 헤더 추가
        res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
        });
        proxyRes.pipe(res);
    });

    proxy.on('error', (err) => {
        console.error('Proxy error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });

    if (req.method === 'POST' || req.method === 'PUT') {
        req.pipe(proxy);
    } else {
        proxy.end();
    }
}

function serveFile(req, res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath);
        const mimeType = mimeTypes[ext] || 'text/plain';
        
        res.writeHead(200, { 
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    
    // CORS preflight 처리
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
        });
        res.end();
        return;
    }

    console.log(`${req.method} ${req.url}`);

    // Supabase API 프록시
    if (reqUrl.pathname.startsWith('/api/')) {
        const supabasePath = reqUrl.pathname.replace('/api', '');
        const targetUrl = SUPABASE_URL + supabasePath;
        proxyRequest(req, res, targetUrl);
        return;
    }

    // 정적 파일 서빙
    let filePath = '.' + reqUrl.pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    // 파일이 존재하는지 확인
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }
        serveFile(req, res, filePath);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 프록시 서버가 http://localhost:${PORT}에서 실행 중입니다!`);
    console.log(`📊 대시보드: http://localhost:${PORT}/admin/proxy-dashboard.html`);
    console.log(`🔧 Supabase API: http://localhost:${PORT}/api/rest/v1/...`);
});

// 서버 종료 처리
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    server.close(() => {
        console.log('서버가 종료되었습니다.');
        process.exit(0);
    });
});
