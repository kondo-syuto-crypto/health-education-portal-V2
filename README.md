# 健康教育ポータル

## プロジェクト概要
- **名前**: 健康教育ポータル
- **目的**: 中学校体育教師が健康教育資料を効率的に共有・管理できるWebプラットフォーム
- **主要機能**: 資料アップロード、カテゴリー分類、検索・フィルタリング、ダークモード対応

## 🌐 公開URL
- **本番サイト**: https://410f59cf.health-education-portal-v2.pages.dev
- **GitHubリポジトリ**: https://github.com/kondo-syuto-crypto/health-education-portal-V2

## ✅ 実装済み機能

### **基本機能**
- 🏥 **レスポンシブデザイン**: PC・タブレット・スマホ完全対応
- 🌓 **ダークモード**: ライト/ダークテーマ切り替え
- 🔍 **リアルタイム検索**: タイトル・説明・タグによる即座の検索
- 📱 **モバイルフレンドリー**: タッチ操作最適化

### **カテゴリー管理**
- 🧠 **心の健康** (紫色) - 心の健康・メンタルヘルス・ストレス管理
- 💪 **身体の健康** (緑色) - 身体の成長・体力向上・運動
- 🌅 **生活習慣** (オレンジ色) - 生活リズム・睡眠・時間管理
- 🥗 **栄養・食育** (赤色) - 食事・栄養・食育・食の安全
- 🛡️ **安全教育** (青色) - 事故防止・応急手当・災害対策
- 🤝 **人間関係** (ピンク色) - 友人関係・家族・コミュニケーション

### **教材管理機能**
- 📎 **URL共有**: Google Slides、Google Docs、YouTube等のURL登録
- 🏷️ **タグシステム**: 複数タグによる柔軟な分類
- ✏️ **詳細情報**: タイトル・説明・作成日時の管理
- 🗑️ **削除機能**: 不要な資料の簡単削除
- 🔗 **ワンクリックアクセス**: 資料カードクリックで新しいタブで開く

### **データ管理**
- 🗄️ **Cloudflare D1データベース**: SQLiteベースのグローバル分散データベース
- 🔄 **リアルタイム同期**: 追加・削除・編集が即座に反映
- 🔐 **クラウド保存**: 安全で永続的なデータ保存
- 🚀 **高速アクセス**: エッジコンピューティングによる高速レスポンス

## 🛠️ 技術スタック

### **フロントエンド**
- **HTML5/CSS3**: セマンティックマークアップ
- **JavaScript (ES6+)**: モダンJavaScript機能
- **Tailwind CSS**: ユーティリティファーストCSS
- **Font Awesome**: アイコンライブラリ
- **Axios**: HTTP通信ライブラリ

### **バックエンド**
- **Hono**: 軽量高速Webフレームワーク
- **TypeScript**: 型安全なJavaScript
- **Cloudflare Workers**: エッジランタイム環境

### **データベース・インフラ**
- **Cloudflare D1**: SQLiteベースの分散データベース
- **Cloudflare Pages**: 静的サイトホスティング
- **Vite**: 高速ビルドツール

## 📊 データ構造

### **categories テーブル**
| カラム | 型 | 説明 |
|--------|----|----- |
| id | INTEGER | プライマリキー |
| name | TEXT | カテゴリー名 |
| description | TEXT | カテゴリー説明 |
| icon | TEXT | 表示アイコン |
| color | TEXT | テーマカラー |
| created_at | DATETIME | 作成日時 |

### **materials テーブル**
| カラム | 型 | 説明 |
|--------|----|----- |
| id | INTEGER | プライマリキー |
| title | TEXT | 資料タイトル |
| description | TEXT | 資料説明 |
| type | TEXT | 'url' または 'file' |
| file_url | TEXT | URL（URLタイプの場合） |
| file_type | TEXT | ファイル形式 |
| original_filename | TEXT | 元ファイル名 |
| file_size | INTEGER | ファイルサイズ（bytes） |
| category_id | INTEGER | カテゴリーID（外部キー） |
| tags | TEXT | タグ（JSON形式） |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

## 📱 使い方ガイド

### **1. 資料を追加する**
1. 右上の「資料を追加」ボタンをクリック
2. タイトル・説明・カテゴリーを入力
3. 「URL」を選択してGoogle SlidesやDocsのURLを貼り付け
4. 必要に応じてタグを追加（カンマ区切り）
5. 「追加」ボタンで登録完了

### **2. 資料を検索する**
- **キーワード検索**: 上部の検索バーに単語を入力
- **カテゴリー絞り込み**: カテゴリータブをクリック
- **複合検索**: 検索バーとカテゴリーの組み合わせ

### **3. 資料を開く**
- 資料カードをクリックすると新しいタブで開く
- URLタイプの資料は直接リンク先へジャンプ

### **4. 資料を削除する**
- 資料カード右上のゴミ箱アイコンをクリック
- 確認ダイアログで「OK」を選択

### **5. テーマを変更する**
- 右上の月/太陽アイコンでライト/ダークモード切り替え
- 設定は自動保存される

## 🚀 デプロイ状況
- **プラットフォーム**: Cloudflare Pages
- **ステータス**: ✅ デプロイ完了・運用中
- **最終更新**: 2025年9月26日
- **ビルド状況**: ✅ 成功

## 📈 今後の拡張予定
- ❌ **ファイルアップロード**: PDF・Word・PowerPoint等の直接アップロード機能
- ❌ **ユーザー管理**: 教師アカウントとアクセス制御
- ❌ **お気に入り機能**: 個人用ブックマーク機能
- ❌ **統計機能**: アクセス数・人気資料の分析
- ❌ **コメント機能**: 資料に対するフィードバック機能

## 🔧 開発者向け情報

### **ローカル開発セットアップ**
```bash
# リポジトリクローン
git clone https://github.com/kondo-syuto-crypto/health-education-portal-V2.git
cd health-education-portal-V2

# 依存関係インストール
npm install

# ローカルD1マイグレーション適用
npm run db:migrate:local

# 開発サーバー起動（D1データベース付き）
npm run dev:d1
```

### **デプロイコマンド**
```bash
# ビルド
npm run build

# Cloudflare Pagesにデプロイ
npx wrangler pages deploy dist --project-name health-education-portal-v2

# プロダクションD1マイグレーション適用
npm run db:migrate:prod
```

### **API エンドポイント**
- `GET /api/categories` - カテゴリー一覧取得
- `GET /api/materials` - 資料一覧取得（検索・フィルター対応）
- `GET /api/materials/:id` - 資料詳細取得
- `POST /api/materials` - 新規資料作成
- `DELETE /api/materials/:id` - 資料削除

## 📄 ライセンス
このプロジェクトはMITライセンスの下で公開されています。

## 👨‍💻 開発者
- **作成者**: Kondo Syuto
- **GitHub**: https://github.com/kondo-syuto-crypto
- **目的**: 中学校体育教師の健康教育活動支援

---

**健康教育ポータルで効率的な資料共有を実現し、より良い健康教育を推進しましょう！** 🏃‍♀️🏃‍♂️