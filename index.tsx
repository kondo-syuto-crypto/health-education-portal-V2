import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定
app.use('/api/*', cors())

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// =============================================================================
// API Routes - 資料管理
// =============================================================================

// カテゴリ一覧取得
app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, description, icon, color FROM categories ORDER BY id
    `).all()

    return c.json({ success: true, data: results })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500)
  }
})

// 資料一覧取得（検索・フィルター対応）
app.get('/api/materials', async (c) => {
  try {
    const { category, search, limit = '20', offset = '0' } = c.req.query()
    
    let query = `
      SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM materials m 
      JOIN categories c ON m.category_id = c.id
    `
    const params = []
    const conditions = []

    // カテゴリフィルター
    if (category && category !== 'all') {
      conditions.push('m.category_id = ?')
      params.push(category)
    }

    // キーワード検索
    if (search && search.trim()) {
      conditions.push('(m.title LIKE ? OR m.description LIKE ? OR m.tags LIKE ?)')
      const searchTerm = `%${search.trim()}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const { results } = await c.env.DB.prepare(query).bind(...params).all()

    // タグをJSONパース
    const materials = results.map(material => ({
      ...material,
      tags: material.tags ? JSON.parse(material.tags) : []
    }))

    return c.json({ success: true, data: materials })
  } catch (error) {
    console.error('Error fetching materials:', error)
    return c.json({ success: false, error: 'Failed to fetch materials' }, 500)
  }
})

// 資料詳細取得
app.get('/api/materials/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { results } = await c.env.DB.prepare(`
      SELECT m.*, c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM materials m 
      JOIN categories c ON m.category_id = c.id 
      WHERE m.id = ?
    `).bind(id).all()

    if (results.length === 0) {
      return c.json({ success: false, error: 'Material not found' }, 404)
    }

    const material = {
      ...results[0],
      tags: results[0].tags ? JSON.parse(results[0].tags) : []
    }

    return c.json({ success: true, data: material })
  } catch (error) {
    console.error('Error fetching material:', error)
    return c.json({ success: false, error: 'Failed to fetch material' }, 500)
  }
})

// 資料投稿
app.post('/api/materials', async (c) => {
  try {
    const { title, description, type, file_url, file_type, original_filename, file_size, category_id, tags } = await c.req.json()

    // バリデーション
    if (!title || !type || !category_id) {
      return c.json({ success: false, error: 'Required fields are missing' }, 400)
    }

    if (type === 'url' && !file_url) {
      return c.json({ success: false, error: 'URL is required for URL type materials' }, 400)
    }

    // URLの妥当性チェック（URLタイプの場合）
    if (type === 'url') {
      try {
        new URL(file_url)
      } catch {
        return c.json({ success: false, error: 'Invalid URL format' }, 400)
      }
    }

    const { success } = await c.env.DB.prepare(`
      INSERT INTO materials (title, description, type, file_url, file_type, original_filename, file_size, category_id, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      description || '',
      type,
      file_url || null,
      file_type || null,
      original_filename || null,
      file_size || null,
      category_id,
      tags ? JSON.stringify(tags) : null
    ).run()

    if (success) {
      return c.json({ success: true, message: 'Material created successfully' })
    } else {
      return c.json({ success: false, error: 'Failed to create material' }, 500)
    }
  } catch (error) {
    console.error('Error creating material:', error)
    return c.json({ success: false, error: 'Failed to create material' }, 500)
  }
})

// 資料削除
app.delete('/api/materials/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const { success } = await c.env.DB.prepare(`
      DELETE FROM materials WHERE id = ?
    `).bind(id).run()

    if (success) {
      return c.json({ success: true, message: 'Material deleted successfully' })
    } else {
      return c.json({ success: false, error: 'Material not found' }, 404)
    }
  } catch (error) {
    console.error('Error deleting material:', error)
    return c.json({ success: false, error: 'Failed to delete material' }, 500)
  }
})

// =============================================================================
// Frontend - メインページ
// =============================================================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>健康教育ポータル</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            /* ダークモード用のCSS変数 */
            :root {
                --bg-color: #ffffff;
                --text-color: #1f2937;
                --card-bg: #ffffff;
                --border-color: #e5e7eb;
                --input-bg: #ffffff;
            }
            
            [data-theme="dark"] {
                --bg-color: #1f2937;
                --text-color: #f9fafb;
                --card-bg: #374151;
                --border-color: #4b5563;
                --input-bg: #374151;
            }
            
            body {
                background-color: var(--bg-color);
                color: var(--text-color);
                transition: all 0.3s ease;
            }
            
            .card {
                background-color: var(--card-bg);
                border-color: var(--border-color);
            }
            
            .input-field {
                background-color: var(--input-bg);
                border-color: var(--border-color);
                color: var(--text-color);
            }
            
            /* カテゴリータブのスタイル */
            .category-tab {
                transition: all 0.3s ease;
            }
            
            .category-tab.active {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            /* モーダルのスタイル */
            .modal {
                backdrop-filter: blur(4px);
            }
            
            .modal-content {
                max-height: 90vh;
                overflow-y: auto;
            }
            
            /* スクロールバーのカスタマイズ */
            .modal-content::-webkit-scrollbar {
                width: 8px;
            }
            
            .modal-content::-webkit-scrollbar-track {
                background: var(--bg-color);
            }
            
            .modal-content::-webkit-scrollbar-thumb {
                background: var(--border-color);
                border-radius: 4px;
            }
        </style>
    </head>
    <body class="min-h-screen">
        <div class="container mx-auto px-4 py-6">
            <!-- ヘッダー -->
            <header class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-center flex items-center gap-3">
                    <span class="text-blue-600">🏥</span>
                    <span class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        健康教育ポータル
                    </span>
                </h1>
                <div class="flex items-center gap-4">
                    <button id="theme-toggle" class="p-2 rounded-lg card border transition-all hover:shadow-md">
                        <i class="fas fa-moon text-lg"></i>
                    </button>
                    <button id="add-material-btn" class="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2">
                        <i class="fas fa-plus"></i>
                        資料を追加
                    </button>
                </div>
            </header>

            <!-- 検索バー -->
            <div class="mb-6">
                <div class="relative max-w-md mx-auto">
                    <input
                        type="text"
                        id="search-input"
                        placeholder="資料を検索..."
                        class="input-field w-full pl-10 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                </div>
            </div>

            <!-- カテゴリータブ -->
            <div class="mb-8">
                <div class="flex flex-wrap gap-3 justify-center" id="category-tabs">
                    <button class="category-tab active px-6 py-3 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold shadow-lg" data-category="all">
                        すべて
                    </button>
                    <!-- カテゴリータブは動的に生成 -->
                </div>
            </div>

            <!-- 資料一覧 -->
            <div id="materials-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- 資料カードは動的に生成 -->
            </div>

            <!-- ローディング -->
            <div id="loading" class="text-center py-8 hidden">
                <i class="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
                <p class="mt-2 text-gray-600">読み込み中...</p>
            </div>

            <!-- 空の状態 -->
            <div id="empty-state" class="text-center py-12 hidden">
                <i class="fas fa-folder-open text-6xl text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">資料がありません</h3>
                <p class="text-gray-600 mb-6">最初の資料を追加してみましょう</p>
                <button class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors" onclick="document.getElementById('add-material-btn').click()">
                    資料を追加
                </button>
            </div>
        </div>

        <!-- 資料追加モーダル -->
        <div id="add-material-modal" class="modal fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="modal-content card bg-white rounded-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">新しい資料を追加</h2>
                    <button id="close-modal" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <form id="add-material-form">
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">タイトル *</label>
                        <input type="text" id="material-title" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">説明</label>
                        <textarea id="material-description" rows="3" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">カテゴリー *</label>
                        <select id="material-category" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required>
                            <option value="">カテゴリーを選択...</option>
                            <!-- カテゴリーオプションは動的に生成 -->
                        </select>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium mb-2">タイプ *</label>
                        <div class="flex gap-4">
                            <label class="flex items-center">
                                <input type="radio" name="material-type" value="url" class="mr-2" checked>
                                URL
                            </label>
                            <label class="flex items-center">
                                <input type="radio" name="material-type" value="file" class="mr-2">
                                ファイル
                            </label>
                        </div>
                    </div>
                    
                    <div id="url-input" class="mb-4">
                        <label class="block text-sm font-medium mb-2">URL *</label>
                        <input type="url" id="material-url" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://...">
                    </div>
                    
                    <div id="file-input" class="mb-4 hidden">
                        <label class="block text-sm font-medium mb-2">ファイル *</label>
                        <input type="file" id="material-file" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx">
                        <p class="text-sm text-gray-500 mt-1">対応ファイル: PDF, Word, PowerPoint, Excel</p>
                    </div>
                    
                    <div class="mb-6">
                        <label class="block text-sm font-medium mb-2">タグ (カンマ区切り)</label>
                        <input type="text" id="material-tags" class="input-field w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="例: 中学生, 保健, 栄養">
                    </div>
                    
                    <div class="flex gap-3">
                        <button type="button" id="cancel-btn" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                            キャンセル
                        </button>
                        <button type="submit" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            追加
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- JavaScript -->
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app