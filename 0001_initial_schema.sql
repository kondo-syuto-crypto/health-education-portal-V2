-- 健康教育カテゴリーテーブル
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 教材テーブル
CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('file', 'url')),
  file_type TEXT,
  file_url TEXT,
  original_filename TEXT,
  file_size INTEGER,
  category_id INTEGER,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials(category_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at);

-- 初期カテゴリーデータ
INSERT OR IGNORE INTO categories (name, description, icon, color) VALUES
  ('心の健康', '心の健康・メンタルヘルス・ストレス管理に関する教材', '🧠', '#8B5CF6'),
  ('身体の健康', '身体の成長・体力向上・運動に関する教材', '💪', '#10B981'),
  ('生活習慣', '生活リズム・睡眠・時間管理に関する教材', '🌅', '#F59E0B'),
  ('栄養・食育', '食事・栄養・食育・食の安全に関する教材', '🥗', '#EF4444'),
  ('安全教育', '事故防止・応急手当・災害対策に関する教材', '🛡️', '#3B82F6'),
  ('人間関係', '友人関係・家族・コミュニケーションに関する教材', '🤝', '#EC4899');