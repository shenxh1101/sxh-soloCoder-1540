import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'eyeglass.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lens_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      refractive_index TEXT NOT NULL CHECK(refractive_index IN ('1.56', '1.60', '1.67')),
      name TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      safety_stock INTEGER NOT NULL DEFAULT 10,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS frame_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      safety_stock INTEGER NOT NULL DEFAULT 5,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      UNIQUE(brand, model)
    );

    CREATE TABLE IF NOT EXISTS optometry_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      left_sphere REAL NOT NULL,
      left_cylinder REAL NOT NULL DEFAULT 0,
      left_axis INTEGER NOT NULL DEFAULT 0,
      right_sphere REAL NOT NULL,
      right_cylinder REAL NOT NULL DEFAULT 0,
      right_axis INTEGER NOT NULL DEFAULT 0,
      pd REAL NOT NULL,
      lens_id INTEGER NOT NULL,
      frame_id INTEGER NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (lens_id) REFERENCES lens_inventory(id),
      FOREIGN KEY (frame_id) REFERENCES frame_inventory(id)
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_records_customer ON optometry_records(customer_id);
    CREATE INDEX IF NOT EXISTS idx_records_created ON optometry_records(created_at);
  `);

  const lensCount = db.prepare('SELECT COUNT(*) as count FROM lens_inventory').get() as { count: number };
  if (lensCount.count === 0) {
    const insertLens = db.prepare(`
      INSERT INTO lens_inventory (refractive_index, name, stock, safety_stock, cost_price, selling_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertLens.run('1.56', '普通树脂镜片 1.56', 50, 10, 30, 120);
    insertLens.run('1.60', '超薄树脂镜片 1.60', 30, 10, 60, 280);
    insertLens.run('1.67', '超超薄树脂镜片 1.67', 20, 10, 120, 580);
  }

  const frameCount = db.prepare('SELECT COUNT(*) as count FROM frame_inventory').get() as { count: number };
  if (frameCount.count === 0) {
    const insertFrame = db.prepare(`
      INSERT INTO frame_inventory (brand, model, stock, safety_stock, cost_price, selling_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertFrame.run('雷朋', 'RB5154', 20, 5, 150, 450);
    insertFrame.run('暴龙', 'BL3015', 15, 5, 180, 520);
    insertFrame.run('派丽蒙', 'PR825', 25, 5, 80, 260);
    insertFrame.run('海伦凯勒', 'HK608', 18, 5, 120, 380);
    insertFrame.run('精工', 'SE-2024', 10, 5, 280, 780);
  }

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (customerCount.count === 0) {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, phone) VALUES (?, ?)
    `);
    const customers = [
      ['张伟', '13800138001'],
      ['李娜', '13800138002'],
      ['王芳', '13800138003'],
      ['刘洋', '13800138004'],
      ['陈静', '13800138005'],
      ['杨磊', '13800138006'],
      ['赵敏', '13800138007'],
      ['周强', '13800138008'],
    ];
    customers.forEach(([name, phone]) => insertCustomer.run(name, phone));

    const insertRecord = db.prepare(`
      INSERT INTO optometry_records 
      (customer_id, left_sphere, left_cylinder, left_axis, right_sphere, right_cylinder, right_axis, pd, lens_id, frame_id, price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleRecords = [
      [1, -2.50, -0.50, 180, -2.75, 0, 0, 62, 1, 1, 570, '2026-05-15 10:30:00'],
      [1, -2.75, -0.75, 175, -3.00, -0.25, 5, 63, 2, 2, 800, '2026-06-10 14:20:00'],
      [2, -3.50, -1.00, 90, -3.25, -0.75, 85, 60, 2, 3, 540, '2026-05-20 09:15:00'],
      [3, -1.50, 0, 0, -1.75, -0.50, 180, 64, 1, 4, 500, '2026-06-01 16:45:00'],
      [4, -4.50, -1.25, 45, -4.75, -1.50, 50, 58, 3, 5, 1360, '2026-06-05 11:00:00'],
      [5, -2.00, 0, 0, -2.25, 0, 0, 65, 1, 2, 640, '2026-06-08 15:30:00'],
      [6, -5.00, -0.75, 120, -4.50, -1.00, 115, 61, 3, 4, 960, '2026-06-12 10:00:00'],
      [7, -1.00, -0.25, 160, -1.25, 0, 0, 66, 1, 3, 380, '2026-06-14 13:20:00'],
    ];
    sampleRecords.forEach((r) => insertRecord.run(...r));
  }
}
