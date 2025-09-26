import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// API route
app.get('/api/hello', (c) => {
  return c.json({ message: 'Hello from Health Education Portal!' })
})

// Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>健康教育ポータル</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <h1 class="text-4xl font-bold text-center text-blue-600 mb-8">
                🏃‍♀️ 健康教育ポータル 🏃‍♂️
            </h1>
            <div class="bg-white rounded-lg shadow-lg p-8">
                <p class="text-lg text-gray-700 mb-4">
                    中学校体育教師のための健康教育資料共有サイトです。
                </p>
                <button id="test-api" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    API テスト
                </button>
                <div id="result" class="mt-4"></div>
            </div>
        </div>
        
        <script>
            document.getElementById('test-api').addEventListener('click', async () => {
                try {
                    const response = await fetch('/api/hello');
                    const data = await response.json();
                    document.getElementById('result').innerHTML = 
                        '<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">' +
                        'API結果: ' + data.message + '</div>';
                } catch (error) {
                    document.getElementById('result').innerHTML = 
                        '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">' +
                        'エラー: ' + error.message + '</div>';
                }
            });
        </script>
    </body>
    </html>
  `)
})

export default app