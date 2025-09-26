// グローバル変数
let currentMaterials = [];
let categories = [];
let currentCategory = 'all';

// DOM読み込み完了後の初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// アプリケーション初期化
async function initializeApp() {
    // ダークモード設定の読み込み
    initializeDarkMode();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // データの初期読み込み
    await loadCategories();
    await loadMaterials();
}

// ダークモード初期化
function initializeDarkMode() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // ダークモード切り替え
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', toggleDarkMode);
    
    // アップロードボタン
    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.addEventListener('click', openUploadModal);
    
    // モーダル関連
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const modalSubmit = document.getElementById('modal-submit');
    
    modalClose.addEventListener('click', closeUploadModal);
    modalCancel.addEventListener('click', closeUploadModal);
    modalSubmit.addEventListener('click', handleUpload);
    
    // アップロードタイプ切り替え
    const uploadFileRadio = document.getElementById('upload-file');
    const uploadUrlRadio = document.getElementById('upload-url');
    
    if (uploadFileRadio && uploadUrlRadio) {
        uploadFileRadio.addEventListener('change', toggleUploadType);
        uploadUrlRadio.addEventListener('change', toggleUploadType);
    }
    
    // 検索
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            loadMaterials();
        }, 300);
    });
    
    // モーダル背景クリックで閉じる
    const uploadModal = document.getElementById('upload-modal');
    uploadModal.addEventListener('click', function(e) {
        if (e.target === uploadModal) {
            closeUploadModal();
        }
    });
}

// ダークモード切り替え
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// カテゴリ読み込み
async function loadCategories() {
    try {
        showLoading(true);
        const response = await axios.get('/api/categories');
        
        if (response.data.success) {
            categories = response.data.data;
            updateCategoryTabs();
            updateCategorySelect();
        } else {
            showError('カテゴリの読み込みに失敗しました');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        showError('カテゴリの読み込み中にエラーが発生しました');
    }
}

// カテゴリタブ更新
function updateCategoryTabs() {
    const categoryTabs = document.getElementById('category-tabs');
    if (!categoryTabs) return;
    
    // 各カテゴリタブを追加
    categories.forEach(cat => {
        const button = document.createElement('button');
        button.className = `category-tab px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-gray-600 transition-colors text-sm font-medium`;
        button.dataset.category = cat.id;
        button.textContent = cat.name;
        
        // クリックイベント追加
        button.addEventListener('click', function() {
            switchCategory(cat.id.toString());
        });
        
        categoryTabs.appendChild(button);
    });
}

// カテゴリ選択更新
function updateCategorySelect() {
    const categorySelect = document.getElementById('category_id');
    if (!categorySelect) return;
    
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

// カテゴリ切り替え
function switchCategory(categoryId) {
    currentCategory = categoryId;
    
    // タブのアクティブ状態更新
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === categoryId || (categoryId === 'all' && tab.dataset.category === 'all')) {
            tab.classList.add('active');
        }
    });
    
    loadMaterials();
}

// 資料読み込み
async function loadMaterials() {
    try {
        showLoading(true);
        
        const searchTerm = document.getElementById('search-input').value;
        
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (currentCategory !== 'all') params.append('category', currentCategory);
        
        const response = await axios.get(`/api/materials?${params.toString()}`);
        
        if (response.data.success) {
            currentMaterials = response.data.data;
            updateMaterialsDisplay();
        } else {
            showError('資料の読み込みに失敗しました');
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        showError('資料の読み込み中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

// 資料表示更新
function updateMaterialsDisplay() {
    const materialsGrid = document.getElementById('materials-grid');
    const emptyState = document.getElementById('empty-state');
    
    if (currentMaterials.length === 0) {
        materialsGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    materialsGrid.classList.remove('hidden');
    emptyState.classList.add('hidden');
    
    materialsGrid.innerHTML = currentMaterials.map(material => createMaterialCard(material)).join('');
    
    // 資料カードクリックイベント追加
    materialsGrid.querySelectorAll('.material-card').forEach(card => {
        card.addEventListener('click', function() {
            const materialId = this.dataset.materialId;
            openMaterial(materialId);
        });
        
        // 削除ボタンイベント
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                deleteMaterial(this.dataset.materialId);
            });
        }
    });
}

// 資料カード作成
function createMaterialCard(material) {
    const tagsHtml = material.tags && material.tags.length > 0 
        ? material.tags.map(tag => `<span class="inline-block bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded text-xs">${escapeHtml(tag)}</span>`).join(' ')
        : '';
    
    const fileTypeIcon = getFileTypeIcon(material.file_type);
    
    return `
        <div class="material-card bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer" data-material-id="${material.id}">
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center space-x-3">
                    <div class="text-2xl">${fileTypeIcon}</div>
                    <div>
                        <h3 class="font-semibold text-gray-900 dark:text-white">${escapeHtml(material.title)}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${material.category_name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-500">作成者: ${escapeHtml(material.author_name)}</p>
                    </div>
                </div>
                <button class="delete-btn text-gray-400 hover:text-red-500 transition-colors" data-material-id="${material.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            ${material.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${escapeHtml(material.description)}</p>` : ''}
            
            ${tagsHtml ? `<div class="flex flex-wrap gap-2 mb-4">${tagsHtml}</div>` : ''}
            
            <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <span>${formatDate(material.created_at)}</span>
                <span class="flex items-center space-x-2">
                    <i class="fas fa-download"></i>
                    <span>${material.download_count || 0}</span>
                </span>
            </div>
        </div>
    `;
}

// ファイルタイプアイコン取得
function getFileTypeIcon(fileType) {
    if (fileType.includes('Google Slides')) return '📊';
    if (fileType.includes('Google Docs')) return '📄';
    if (fileType.includes('Google Sheets')) return '📈';
    if (fileType.includes('YouTube')) return '🎬';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('docx')) return '📘';
    if (fileType.includes('excel') || fileType.includes('xlsx')) return '📗';
    if (fileType.includes('powerpoint') || fileType.includes('pptx')) return '📙';
    return '🔗';
}

// 資料を開く
function openMaterial(materialId) {
    const material = currentMaterials.find(m => m.id == materialId);
    if (material && material.file_url) {
        window.open(material.file_url, '_blank');
        
        // ダウンロード数更新（APIがあれば）
        // updateDownloadCount(materialId);
    }
}

// 資料削除
async function deleteMaterial(materialId) {
    if (!confirm('この資料を削除してもよろしいですか？')) return;
    
    try {
        const response = await axios.delete(`/api/materials/${materialId}`);
        
        if (response.data.success) {
            showSuccess('資料が削除されました');
            loadMaterials();
        } else {
            showError('資料の削除に失敗しました');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showError('削除中にエラーが発生しました');
    }
}

// アップロードモーダル開く
function openUploadModal() {
    document.getElementById('upload-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// アップロードモーダル閉じる
function closeUploadModal() {
    document.getElementById('upload-modal').classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('upload-form').reset();
    toggleUploadType(); // リセット
}

// アップロードタイプ切り替え
function toggleUploadType() {
    const uploadType = document.querySelector('input[name="upload_type"]:checked').value;
    const fileSection = document.getElementById('file-upload-section');
    const urlSection = document.getElementById('url-upload-section');
    
    if (uploadType === 'file') {
        fileSection.classList.remove('hidden');
        urlSection.classList.add('hidden');
    } else {
        fileSection.classList.add('hidden');
        urlSection.classList.remove('hidden');
    }
}

// アップロード処理
async function handleUpload() {
    const form = document.getElementById('upload-form');
    const formData = new FormData();
    
    // フォームデータ収集
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const authorName = document.getElementById('author_name').value.trim();
    const categoryId = document.getElementById('category_id').value;
    const tagsInput = document.getElementById('tags').value.trim();
    const uploadType = document.querySelector('input[name="upload_type"]:checked').value;
    
    // バリデーション
    if (!title || !authorName || !categoryId) {
        showError('必須項目を入力してください');
        return;
    }
    
    // タグ処理
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // FormDataに追加
    formData.append('title', title);
    formData.append('description', description);
    formData.append('author_name', authorName);
    formData.append('category_id', categoryId);
    formData.append('tags', JSON.stringify(tags));
    formData.append('upload_type', uploadType);
    
    if (uploadType === 'url') {
        const materialUrl = document.getElementById('material-url').value.trim();
        if (!materialUrl) {
            showError('URLを入力してください');
            return;
        }
        formData.append('material_url', materialUrl);
    } else {
        const fileInput = document.getElementById('file');
        if (!fileInput.files[0]) {
            showError('ファイルを選択してください');
            return;
        }
        formData.append('file', fileInput.files[0]);
    }
    
    try {
        showLoading(true);
        const response = await axios.post('/api/materials', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.success) {
            showSuccess('資料が正常に追加されました');
            closeUploadModal();
            loadMaterials();
        } else {
            showError(response.data.error || '資料の追加に失敗しました');
        }
    } catch (error) {
        console.error('Error uploading material:', error);
        showError('アップロード中にエラーが発生しました');
    } finally {
        showLoading(false);
    }
}

// ローディング表示
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

// 成功メッセージ表示
function showSuccess(message) {
    showNotification(message, 'success');
}

// エラーメッセージ表示
function showError(message) {
    showNotification(message, 'error');
}

// 通知表示
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transition-all transform translate-x-full`;
    
    if (type === 'success') {
        notification.className += ' bg-green-500 text-white';
    } else if (type === 'error') {
        notification.className += ' bg-red-500 text-white';
    } else {
        notification.className += ' bg-blue-500 text-white';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // アニメーション
    setTimeout(() => notification.classList.remove('translate-x-full'), 100);
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// ユーティリティ関数
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}