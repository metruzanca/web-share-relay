# Forward Web Share

A PWA that acts as a Web Share Target on Android, forwarding shared content to your custom API endpoint.

## How It Works

1. Install the PWA on your Android device
2. Configure your API endpoint URL in the app
3. Share content from any app (links, text, images)
4. The PWA receives the share and forwards it to your endpoint

## Installation

### PWA (Client)

```bash
pnpm install
pnpm run dev
```

Deploy to any static host (Vercel, Netlify, etc.) and install as a PWA on Android.

### Debug Server

For testing locally:

```bash
cd server
node index.js
```

Then expose via ngrok:

```bash
ngrok http 3001
```

Use the ngrok URL as your Forward URL in the PWA.

---

## API Integration Guide

When content is shared to the PWA, it sends a POST request to your configured endpoint.

### Request Format

**Method:** `POST`  
**Content-Type:** `application/json`

**Payload:**

```json
{
  "title": "string | null",
  "text": "string | null",
  "url": "string | null",
  "files": [
    {
      "name": "filename.jpg",
      "type": "image/jpeg",
      "data": "base64-encoded-content"
    }
  ]
}
```

### Field Details

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string \| null` | Share title (rarely populated by apps) |
| `text` | `string \| null` | Shared text content, often contains URLs |
| `url` | `string \| null` | Explicit URL (some apps use `text` instead) |
| `files` | `array` | Array of shared files (images, documents, etc.) |
| `files[].name` | `string` | Original filename |
| `files[].type` | `string` | MIME type (e.g., `image/jpeg`, `image/png`) |
| `files[].data` | `string` | Base64-encoded file content |

### Expected Response

Return any `2xx` status code to indicate success. The response body is logged but not required.

```json
{
  "success": true,
  "message": "Received!"
}
```

---

## curl Examples

### Text/URL Share

When sharing a link from most apps (Twitter/X, browsers, etc.):

```bash
curl -X POST https://your-api.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "title": null,
    "text": "https://x.com/i/status/2014072280419041678",
    "url": null,
    "files": []
  }'
```

### Image Share

When sharing an image (from gallery, screenshots, etc.):

```bash
curl -X POST https://your-api.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "title": null,
    "text": "https://example.com/some-page",
    "url": null,
    "files": [
      {
        "name": "screenshot.jpg",
        "type": "image/jpeg",
        "data": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD..."
      }
    ]
  }'
```

### Multiple Files

```bash
curl -X POST https://your-api.com/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "title": null,
    "text": null,
    "url": null,
    "files": [
      {
        "name": "image1.jpg",
        "type": "image/jpeg",
        "data": "/9j/4AAQSkZJRg..."
      },
      {
        "name": "image2.png",
        "type": "image/png",
        "data": "iVBORw0KGgo..."
      }
    ]
  }'
```

---

## Example Server Implementations

### Node.js (Express)

```javascript
import express from 'express';

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/webhook', (req, res) => {
  const { title, text, url, files } = req.body;
  
  console.log('Received share:', { title, text, url, filesCount: files?.length });
  
  // Process files
  for (const file of files || []) {
    const buffer = Buffer.from(file.data, 'base64');
    // Save to disk, upload to S3, etc.
    console.log(`File: ${file.name} (${file.type}, ${buffer.length} bytes)`);
  }
  
  res.json({ success: true });
});

app.listen(3000);
```

### Python (Flask)

```python
from flask import Flask, request, jsonify
import base64

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    
    print(f"Title: {data.get('title')}")
    print(f"Text: {data.get('text')}")
    print(f"URL: {data.get('url')}")
    
    for file in data.get('files', []):
        content = base64.b64decode(file['data'])
        print(f"File: {file['name']} ({file['type']}, {len(content)} bytes)")
        # Save or process file
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(port=3000)
```

### Deno

```typescript
Deno.serve({ port: 3000 }, async (req) => {
  if (req.method === 'POST') {
    const { title, text, url, files } = await req.json();
    
    console.log('Received:', { title, text, url, filesCount: files?.length });
    
    for (const file of files || []) {
      const bytes = Uint8Array.from(atob(file.data), c => c.charCodeAt(0));
      console.log(`File: ${file.name} (${file.type}, ${bytes.length} bytes)`);
    }
    
    return Response.json({ success: true });
  }
  
  return new Response('Not found', { status: 404 });
});
```

---

## CORS Configuration

Since the PWA makes cross-origin requests, your server must handle CORS:

```javascript
// Required headers
res.setHeader('Access-Control-Allow-Origin', '*'); // Or specific origin
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

// Handle preflight
if (req.method === 'OPTIONS') {
  res.status(204).end();
  return;
}
```

---

## Notes

- **Text field often contains URLs**: Many Android apps put the shared URL in `text` rather than `url`
- **Large payloads**: Images are base64-encoded, so a 1MB image becomes ~1.33MB in the request. Configure your server's body size limit accordingly
- **File naming**: Android often generates random filenames for shared images (e.g., `17690344131941827677020691542936.jpg`)
