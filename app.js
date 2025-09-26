// グローバル変数
let currentCategory = 'all';
let categories = [];
let materials = [];

// DOM要素
const elementsSelector = {
    categoryTabs: '#category-tabs',
    materialsContainer: '#materials-container',
    searchInput: '#search-input',
    loading: '#loading',
    emptyState: '#empty-state',
    addMaterialBtn: '#add-material-btn',
    addMaterialModal: '#add-material-modal',
    closeModalBtn: '#close-modal',
    cancelBtn: '#cancel-btn',
    addMaterialForm: '#add-material-form',
    themeToggle: '#theme-toggle'
};

// ページロード時の初期化
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadMaterials();
    setupEventListeners();
    initTheme();
});

// カテゴリー読み込み
async function loadCategories() {
    try {
        const response = await axios.get('/api/categories');
        if (response.data.success) {
            categories = response.data.data;
            renderCategoryTabs();
            renderCategoryOptions();
        } else {
            console.error('Failed to load categories:', response.data.error);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// 資料読み込み
async function loadMaterials() {
    showLoading();
    try {
        const searchTerm = document.querySelector(elementsSelector.searchInput).value;
        const params = new URLSearchParams({
            category: currentCategory,
            search: searchTerm,
            limit: '50'
        });

        const response = await axios.get(`/api/materials?${params}`);
        if (response.data.success) {
            materials = response.data.data;
            renderMaterials();
        } else {
            console.error('Failed to load materials:', response.data.error);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading materials:', error);
        showEmptyState();
    } finally {
        hideLoading();
    }
}

// カテゴリータブ描画
function renderCategoryTabs() {
    const tabsContainer = document.querySelector(elementsSelector.categoryTabs);
    const allTab = tabsContainer.querySelector('[data-category="all"]');
    
    // 既存のカテゴリータブを削除（「すべて」タブ以外）
    const existingTabs = tabsContainer.querySelectorAll('.category-tab:not([data-category="all"])');
    existingTabs.forEach(tab => tab.remove());

    // カテゴリータブを追加
    categories.forEach(category => {
        const tab = document.createElement('button');
        tab.className = 'category-tab px-6 py-3 rounded-full text-white font-semibold shadow-lg transition-all hover:shadow-xl';
        tab.style.background = `linear-gradient(135deg, ${category.color}, ${category.color}dd)`;
        tab.dataset.category = category.id;
        tab.innerHTML = `${category.icon} ${category.name}`;
        tabsContainer.appendChild(tab);
    });
}

// カテゴリーオプション描画
function renderCategoryOptions() {
    const select = document.querySelector('#material-category');
    // 既存のオプションをクリア（最初のオプション以外）
    select.innerHTML = '<option value="">カテゴリーを選択...</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon} ${category.name}`;
        select.appendChild(option);
    });
}

// 資料一覧描画
function renderMaterials() {
    const container = document.querySelector(elementsSelector.materialsContainer);
    
    if (materials.length === 0) {
        showEmptyState();
        return;
    }

    hideEmptyState();
    
    container.innerHTML = materials.map(material => {
        const tagsHtml = material.tags && material.tags.length > 0 
            ? material.tags.map(tag => `<span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">${tag}</span>`).join(' ')
            : '';

        const typeIcon = material.type === 'url' ? 'fas fa-link' : 'fas fa-file';
        const typeColor = material.type === 'url' ? 'text-blue-500' : 'text-green-500';

        return `
            <div class="card border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer" data-material-id="${material.id}">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${material.category_icon}</span>
                        <div>
                            <h3 class="font-bold text-lg">${escapeHtml(material.title)}</h3>
                            <p class="text-sm opacity-75">${material.category_name}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="${typeIcon} ${typeColor}"></i>
                        <button class="delete-material text-red-500 hover:text-red-700 p-1" data-material-id="${material.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                ${material.description ? `<p class="text-sm mb-4 opacity-80">${escapeHtml(material.description)}</p>` : ''}
                
                ${tagsHtml ? `<div class="flex flex-wrap gap-2 mb-4">${tagsHtml}</div>` : ''}
                
                <div class="flex justify-between items-center text-sm opacity-60">
                    <span>${formatDate(material.created_at)}</span>
                    ${material.type === 'file' && material.file_size ? `<span>${formatFileSize(material.file_size)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// イベントリスナー設定
function setupEventListeners() {
    // カテゴリータブクリック
    document.querySelector(elementsSelector.categoryTabs).addEventListener('click', (e) => {
        if (e.target.classList.contains('category-tab')) {
            // タブの状態更新
            document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            
            // カテゴリー変更
            currentCategory = e.target.dataset.category;
            loadMaterials();
        }
    });

    // 検索入力
    let searchTimeout;
    document.querySelector(elementsSelector.searchInput).addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadMaterials, 300);
    });

    // 資料クリック（詳細表示またはリンク開く）
    document.querySelector(elementsSelector.materialsContainer).addEventListener('click', async (e) => {
        const card = e.target.closest('[data-material-id]');
        if (!card) return;

        // 削除ボタンがクリックされた場合
        if (e.target.closest('.delete-material')) {
            e.stopPropagation();
            const materialId = e.target.closest('.delete-material').dataset.materialId;
            await deleteMaterial(materialId);
            return;
        }

        // 資料カードがクリックされた場合
        const materialId = card.dataset.materialId;
        const material = materials.find(m => m.id == materialId);
        
        if (material && material.type === 'url' && material.file_url) {
            window.open(material.file_url, '_blank');
        }
    });

    // モーダル関連
    document.querySelector(elementsSelector.addMaterialBtn).addEventListener('click', openModal);
    document.querySelector(elementsSelector.closeModalBtn).addEventListener('click', closeModal);
    document.querySelector(elementsSelector.cancelBtn).addEventListener('click', closeModal);
    
    // モーダル外クリックで閉じる
    document.querySelector(elementsSelector.addMaterialModal).addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // フォーム送信
    document.querySelector(elementsSelector.addMaterialForm).addEventListener('submit', handleFormSubmit);

    // タイプ切り替え
    document.querySelectorAll('input[name="material-type"]').forEach(radio => {
        radio.addEventListener('change', toggleInputType);
    });

    // テーマ切り替え
    document.querySelector(elementsSelector.themeToggle).addEventListener('click', toggleTheme);
}

// モーダル開く
function openModal() {
    document.querySelector(elementsSelector.addMaterialModal).classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// モーダル閉じる
function closeModal() {
    document.querySelector(elementsSelector.addMaterialModal).classList.add('hidden');
    document.body.style.overflow = '';
    document.querySelector(elementsSelector.addMaterialForm).reset();
    toggleInputType(); // 初期状態に戻す
}

// 入力タイプ切り替え
function toggleInputType() {
    const selectedType = document.querySelector('input[name="material-type"]:checked').value;
    const urlInput = document.querySelector('#url-input');
    const fileInput = document.querySelector('#file-input');
    
    if (selectedType === 'url') {
        urlInput.classList.remove('hidden');
        fileInput.classList.add('hidden');
        document.querySelector('#material-url').required = true;
        document.querySelector('#material-file').required = false;
    } else {
        urlInput.classList.add('hidden');
        fileInput.classList.remove('hidden');
        document.querySelector('#material-url').required = false;
        document.querySelector('#material-file').required = true;
    }
}

// フォーム送信処理
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        title: document.querySelector('#material-title').value,
        description: document.querySelector('#material-description').value,
        category_id: parseInt(document.querySelector('#material-category').value),
        type: document.querySelector('input[name="material-type"]:checked').value,
        tags: document.querySelector('#material-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    if (formData.type === 'url') {
        formData.file_url = document.querySelector('#material-url').value;
    } else {
        // ファイルアップロードは将来実装
        alert('ファイルアップロード機能は現在開発中です。URLタイプをご利用ください。');
        return;
    }

    try {
        const response = await axios.post('/api/materials', formData);
        if (response.data.success) {
            closeModal();
            loadMaterials();
            showNotification('資料が正常に追加されました', 'success');
        } else {
            showNotification(response.data.error || '資料の追加に失敗しました', 'error');
        }
    } catch (error) {
        console.error('Error creating material:', error);
        showNotification('資料の追加に失敗しました', 'error');
    }
}

// 資料削除
async function deleteMaterial(materialId) {
    if (!confirm('この資料を削除してもよろしいですか？')) return;

    try {
        const response = await axios.delete(`/api/materials/${materialId}`);
        if (response.data.success) {
            loadMaterials();
            showNotification('資料が削除されました', 'success');
        } else {
            showNotification('資料の削除に失敗しました', 'error');
        }
    } catch (error) {
        console.error('Error deleting material:', error);
        showNotification('資料の削除に失敗しました', 'error');
    }
}

// テーマ関連
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeIcon = document.querySelector('#theme-toggle i');
    themeIcon.className = theme === 'light' ? 'fas fa-moon text-lg' : 'fas fa-sun text-lg';
}

// UI状態制御
function showLoading() {
    document.querySelector(elementsSelector.loading).classList.remove('hidden');
    document.querySelector(elementsSelector.materialsContainer).classList.add('hidden');
    document.querySelector(elementsSelector.emptyState).classList.add('hidden');
}

function hideLoading() {
    document.querySelector(elementsSelector.loading).classList.add('hidden');
    document.querySelector(elementsSelector.materialsContainer).classList.remove('hidden');
}

function showEmptyState() {
    document.querySelector(elementsSelector.emptyState).classList.remove('hidden');
    document.querySelector(elementsSelector.materialsContainer).classList.add('hidden');
}

function hideEmptyState() {
    document.querySelector(elementsSelector.emptyState).classList.add('hidden');
}

// 通知表示
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg text-white font-semibold shadow-lg z-50 transition-all transform translate-x-full`;
    
    if (type === 'success') {
        notification.classList.add('bg-green-500');
    } else if (type === 'error') {
        notification.classList.add('bg-red-500');
    } else {
        notification.classList.add('bg-blue-500');
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}