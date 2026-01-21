import { createServer } from 'http';

const PORT = process.env.PORT || 3001;

const server = createServer(async (req, res) => {
  const timestamp = new Date().toISOString();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`${'='.repeat(60)}`);
  
  // Log headers
  console.log('\nHeaders:');
  for (const [key, value] of Object.entries(req.headers)) {
    console.log(`  ${key}: ${value}`);
  }

  // Parse body for POST requests
  if (req.method === 'POST') {
    let body = '';
    
    for await (const chunk of req) {
      body += chunk;
    }
    
    console.log('\nBody:');
    try {
      const json = JSON.parse(body);
      
      // Log payload summary
      console.log(`  title: ${json.title || '(none)'}`);
      console.log(`  text: ${json.text || '(none)'}`);
      console.log(`  url: ${json.url || '(none)'}`);
      console.log(`  files: ${json.files?.length || 0}`);
      
      // Log file details if present
      if (json.files?.length > 0) {
        console.log('\n  File details:');
        for (const file of json.files) {
          const sizeKB = (file.data?.length * 0.75 / 1024).toFixed(2);
          console.log(`    - ${file.name} (${file.type}, ~${sizeKB} KB)`);
        }
      }
      
      // Full JSON (truncate base64 data for readability)
      const logJson = {
        ...json,
        files: json.files?.map(f => ({
          name: f.name,
          type: f.type,
          data: f.data ? `[base64, ${f.data.length} chars]` : null
        }))
      };
      console.log('\nFull payload (files truncated):');
      console.log(JSON.stringify(logJson, null, 2));
      
    } catch (e) {
      console.log(`  (raw): ${body.slice(0, 500)}${body.length > 500 ? '...' : ''}`);
    }
  }

  // Send success response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    success: true, 
    message: 'Received!',
    timestamp 
  }));
  
  console.log('\n✓ Response sent: 200 OK');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Debug server running at http://localhost:${PORT}`);
  console.log(`\nTo expose via ngrok:`);
  console.log(`  ngrok http ${PORT}`);
  console.log(`\nThen use the ngrok URL as your Relay URL in the PWA.\n`);
});
