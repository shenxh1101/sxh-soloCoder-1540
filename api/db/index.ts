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

    CREATE TABLE IF NOT EXISTS inventory_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK(item_type IN ('lens', 'frame')),
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      change_type TEXT NOT NULL CHECK(change_type IN ('sale', 'restock', 'void_return', 'exchange_return', 'exchange_sale', 'purchase_restock')),
      quantity INTEGER NOT NULL,
      stock_before INTEGER NOT NULL,
      stock_after INTEGER NOT NULL,
      related_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS follow_up_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('phone', 'visit', 'other')),
      result TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_person TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      supplier_id INTEGER,
      order_date DATE NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid')),
      paid_amount REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_order_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('lens', 'frame')),
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_records_customer ON optometry_records(customer_id);
    CREATE INDEX IF NOT EXISTS idx_records_created ON optometry_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_item ON inventory_transactions(item_type, item_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON inventory_transactions(created_at);
    CREATE INDEX IF NOT EXISTS idx_followups_customer ON follow_up_records(customer_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
    CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
    CREATE INDEX IF NOT EXISTS idx_po_payment ON purchase_orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_po_items_order ON purchase_order_items(purchase_order_id);
  `);

  try {
    db.exec(`ALTER TABLE optometry_records ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'voided'))`);
  } catch {}

  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_records_status ON optometry_records(status)`);
  } catch {}

  try {
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN supplier_id INTEGER`);
  } catch {}
  try {
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN order_date DATE DEFAULT CURRENT_DATE`);
  } catch {}
  try {
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'partial', 'paid'))`);
  } catch {}
  try {
    db.exec(`ALTER TABLE purchase_orders ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0`);
  } catch {}

  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get() as { count: number };
  if (supplierCount.count === 0) {
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (name, contact_person, phone, address, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertSupplier.run('诚信光学镜片批发', '王经理', '13900139001', '上海市浦东新区眼镜城A栋3号', '主要供应1.56和1.60折射率镜片');
    insertSupplier.run('光明镜架厂', '李总', '13800138002', '广州市越秀区眼镜批发市场B区12号', '品牌镜架，性价比高');
    insertSupplier.run('视博医疗科技', '张工', '13700137003', '深圳市龙岗区光学产业园', '高端镜片，1.67折射率');
  }

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
