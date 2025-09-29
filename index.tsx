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
      SELECT id, name, description FROM categories ORDER BY id
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
      SELECT m.*, c.name as category_name 
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
      conditions.push('m.keywords LIKE ?')
      params.push(`%${search.trim()}%`)
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
      SELECT m.*, c.name as category_name 
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

// 資料作成（ファイルアップロード・URL共有）
app.post('/api/materials', async (c) => {
  try {
    const formData = await c.req.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string || ''
    const authorName = formData.get('author_name') as string
    const categoryId = formData.get('category_id') as string
    const tagsStr = formData.get('tags') as string || '[]'
    const uploadType = formData.get('upload_type') as string
    const materialUrl = formData.get('material_url') as string
    const file = formData.get('file') as File

    if (!title || !authorName || !categoryId) {
      return c.json({ success: false, error: 'Required fields are missing' }, 400)
    }

    let fileName: string
    let fileType: string
    let fileSize: number
    let fileUrl: string
    let downloadUrl: string

    if (uploadType === 'url' && materialUrl) {
      // URL共有の場合
      if (!isValidUrl(materialUrl)) {
        return c.json({ success: false, error: 'Invalid URL format' }, 400)
      }

      // URLからファイルタイプを推測
      fileType = detectUrlFileType(materialUrl)
      fileName = `url_${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}`
      fileSize = 0
      fileUrl = materialUrl
      downloadUrl = materialUrl

    } else {
      // ファイルアップロードの場合 - 現在は未実装
      return c.json({ success: false, error: 'File upload feature is not implemented yet. Please use URL sharing.' }, 400)
    }

    // タグとキーワードの処理
    const tags = JSON.parse(tagsStr)
    const keywords = [
      title,
      description,
      authorName,
      ...tags
    ].filter(Boolean).join(' ')

    // データベースに保存
    const result = await c.env.DB.prepare(`
      INSERT INTO materials (
        title, description, author_name, file_name, file_type, file_size,
        file_url, download_url, category_id, tags, keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title, description, authorName, fileName, fileType, fileSize,
      fileUrl, downloadUrl, categoryId, JSON.stringify(tags), keywords
    ).run()

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        title,
        file_name: fileName,
        file_url: fileUrl
      }
    })

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
// Utility Functions
// =============================================================================

function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

function detectUrlFileType(url: string): string {
  if (url.includes('docs.google.com/presentation') || url.includes('slides.google.com')) {
    return 'Google Slides'
  } else if (url.includes('docs.google.com/document')) {
    return 'Google Docs'
  } else if (url.includes('docs.google.com/spreadsheets')) {
    return 'Google Sheets'
  } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'YouTube Video'
  } else {
    return 'Web URL'
  }
}

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
        <title>保健体育資料ポータル〜保健編〜</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script>
            tailwind.config = {
                darkMode: 'class',
                theme: {
                    extend: {
                        colors: {
                            primary: {
                                50: '#eff6ff',
                                500: '#3b82f6',
                                600: '#2563eb',
                                700: '#1d4ed8',
                            }
                        }
                    }
                }
            }
        </script>
        <style>
            .category-tab.active {
                @apply bg-primary-600 text-white shadow-lg;
            }
        </style>
    </head>
    <body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
        <div class="min-h-screen">
            <!-- ヘッダー -->
            <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div class="flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                            <div class="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-lg">
                                <i class="fas fa-heartbeat text-white text-xl"></i>
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">保健体育資料ポータル〜保健編〜</h1>
                                <p class="text-sm text-gray-600 dark:text-gray-400">中学校体育教師のための教材共有サイト</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button id="theme-toggle" class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <i class="fas fa-moon dark:hidden text-gray-600"></i>
                                <i class="fas fa-sun hidden dark:inline text-yellow-400"></i>
                            </button>
                            <button id="upload-btn" class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2">
                                <i class="fas fa-plus"></i>
                                <span>資料を追加</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <!-- カテゴリータブ -->
                <div class="mb-8">
                    <div class="flex flex-wrap gap-2 justify-center" id="category-tabs">
                        <button class="category-tab active px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium" data-category="all">
                            すべて
                        </button>
                    </div>
                </div>

                <!-- 検索バー -->
                <div class="mb-8">
                    <div class="relative max-w-md mx-auto">
                        <input
                            type="text"
                            id="search-input"
                            placeholder="資料を検索..."
                            class="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                        <i class="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>

                <!-- 資料一覧 -->
                <div id="materials-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- 資料カードが動的に生成される -->
                </div>

                <!-- ローディング状態 -->
                <div id="loading" class="text-center py-12 hidden">
                    <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-primary-600 bg-white dark:bg-gray-800 transition ease-in-out duration-150 cursor-not-allowed">
                        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        読み込み中...
                    </div>
                </div>

                <!-- 空の状態 -->
                <div id="empty-state" class="text-center py-12 hidden">
                    <i class="fas fa-folder-open text-6xl text-gray-400 dark:text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">資料がありません</h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">最初の教材を追加してみましょう</p>
                    <button class="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors" onclick="document.getElementById('upload-btn').click()">
                        資料を追加
                    </button>
                </div>
            </main>
        </div>

        <!-- アップロードモーダル -->
        <div id="upload-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center p-4 z-50">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">新しい資料を追加</h3>
                        <button id="modal-close" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="p-6 overflow-y-auto">
                    <form id="upload-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">タイトル *</label>
                            <input type="text" id="title" name="title" required 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">説明</label>
                            <textarea id="description" name="description" rows="3" 
                                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">作成者名 *</label>
                            <input type="text" id="author_name" name="author_name" required 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">カテゴリー *</label>
                            <select id="category_id" name="category_id" required 
                                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                                <option value="">選択してください</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">資料URL *</label>
                            <input type="url" id="material-url" name="material_url" placeholder="https://docs.google.com/presentation/d/..." required
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Google Slides, Google Docs, YouTube等のURLを入力してください</p>
                            <input type="hidden" name="upload_type" value="url">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">タグ (カンマ区切り)</label>
                            <input type="text" id="tags" name="tags" placeholder="例: 中学生,保健,栄養" 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                        </div>
                    </form>
                </div>
                <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
                    <button id="modal-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-100">
                        キャンセル
                    </button>
                    <button id="modal-submit" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md">
                        追加
                    </button>
                </div>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app