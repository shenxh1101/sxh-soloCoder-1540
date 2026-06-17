import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/lenses', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM lens_inventory ORDER BY refractive_index').all();
  const lenses = rows.map((row: any) => ({
    id: row.id,
    refractiveIndex: row.refractive_index,
    name: row.name,
    stock: row.stock,
    safetyStock: row.safety_stock,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
  }));
  res.json(lenses);
});

router.post('/lenses/:id/restock', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: '入库数量必须大于0' });
    return;
  }

  const lens = db.prepare('SELECT * FROM lens_inventory WHERE id = ?').get(id) as any;
  if (!lens) {
    res.status(404).json({ error: '镜片不存在' });
    return;
  }

  const tx = db.transaction(() => {
    const stockBefore = lens.stock;
    db.prepare('UPDATE lens_inventory SET stock = stock + ? WHERE id = ?').run(quantity, id);
    const stockAfter = stockBefore + quantity;
    db.prepare(
      `INSERT INTO inventory_transactions (item_type, item_id, item_name, change_type, quantity, stock_before, stock_after, related_id)
       VALUES ('lens', ?, ?, 'restock', ?, ?, ?, NULL)`
    ).run(id, lens.name, quantity, stockBefore, stockAfter);
  });

  tx();
  const updated = db.prepare('SELECT * FROM lens_inventory WHERE id = ?').get(id) as any;

  res.json({
    id: updated.id,
    refractiveIndex: updated.refractive_index,
    name: updated.name,
    stock: updated.stock,
    safetyStock: updated.safety_stock,
    costPrice: updated.cost_price,
    sellingPrice: updated.selling_price,
  });
});

router.put('/lenses/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, safetyStock, costPrice, sellingPrice } = req.body;

  db.prepare(
    `UPDATE lens_inventory 
     SET name = COALESCE(?, name),
         safety_stock = COALESCE(?, safety_stock),
         cost_price = COALESCE(?, cost_price),
         selling_price = COALESCE(?, selling_price)
     WHERE id = ?`
  ).run(name, safetyStock, costPrice, sellingPrice, id);

  const updated = db.prepare('SELECT * FROM lens_inventory WHERE id = ?').get(id) as any;
  res.json({
    id: updated.id,
    refractiveIndex: updated.refractive_index,
    name: updated.name,
    stock: updated.stock,
    safetyStock: updated.safety_stock,
    costPrice: updated.cost_price,
    sellingPrice: updated.selling_price,
  });
});

router.get('/frames', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM frame_inventory ORDER BY brand, model').all();
  const frames = rows.map((row: any) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    stock: row.stock,
    safetyStock: row.safety_stock,
    costPrice: row.cost_price,
    sellingPrice: row.selling_price,
  }));
  res.json(frames);
});

router.post('/frames/:id/restock', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    res.status(400).json({ error: '入库数量必须大于0' });
    return;
  }

  const frame = db.prepare('SELECT * FROM frame_inventory WHERE id = ?').get(id) as any;
  if (!frame) {
    res.status(404).json({ error: '镜架不存在' });
    return;
  }

  const tx = db.transaction(() => {
    const stockBefore = frame.stock;
    db.prepare('UPDATE frame_inventory SET stock = stock + ? WHERE id = ?').run(quantity, id);
    const stockAfter = stockBefore + quantity;
    db.prepare(
      `INSERT INTO inventory_transactions (item_type, item_id, item_name, change_type, quantity, stock_before, stock_after, related_id)
       VALUES ('frame', ?, ?, 'restock', ?, ?, ?, NULL)`
    ).run(id, `${frame.brand} ${frame.model}`, quantity, stockBefore, stockAfter);
  });

  tx();
  const updated = db.prepare('SELECT * FROM frame_inventory WHERE id = ?').get(id) as any;

  res.json({
    id: updated.id,
    brand: updated.brand,
    model: updated.model,
    stock: updated.stock,
    safetyStock: updated.safety_stock,
    costPrice: updated.cost_price,
    sellingPrice: updated.selling_price,
  });
});

router.put('/frames/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { brand, model, safetyStock, costPrice, sellingPrice } = req.body;

  db.prepare(
    `UPDATE frame_inventory 
     SET brand = COALESCE(?, brand),
         model = COALESCE(?, model),
         safety_stock = COALESCE(?, safety_stock),
         cost_price = COALESCE(?, cost_price),
         selling_price = COALESCE(?, selling_price)
     WHERE id = ?`
  ).run(brand, model, safetyStock, costPrice, sellingPrice, id);

  const updated = db.prepare('SELECT * FROM frame_inventory WHERE id = ?').get(id) as any;
  res.json({
    id: updated.id,
    brand: updated.brand,
    model: updated.model,
    stock: updated.stock,
    safetyStock: updated.safety_stock,
    costPrice: updated.cost_price,
    sellingPrice: updated.selling_price,
  });
});

router.get('/alerts', (_req: Request, res: Response) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

  const lensAlerts = db
    .prepare('SELECT * FROM lens_inventory WHERE stock <= safety_stock')
    .all()
    .map((row: any) => {
      const salesRow = db
        .prepare(
          `SELECT COUNT(*) as count FROM optometry_records 
           WHERE lens_id = ? AND status = 'active' AND created_at >= ?`
        )
        .get(row.id, thirtyDaysStr) as any;
      const monthlySales = salesRow?.count || 0;
      const suggestedRestock = Math.max(0, row.safety_stock - row.stock + Math.ceil(monthlySales * 1.5));
      return {
        type: 'lens' as const,
        id: row.id,
        name: row.name,
        stock: row.stock,
        safetyStock: row.safety_stock,
        monthlySales,
        suggestedRestock,
      };
    });

  const frameAlerts = db
    .prepare('SELECT * FROM frame_inventory WHERE stock <= safety_stock')
    .all()
    .map((row: any) => {
      const salesRow = db
        .prepare(
          `SELECT COUNT(*) as count FROM optometry_records 
           WHERE frame_id = ? AND status = 'active' AND created_at >= ?`
        )
        .get(row.id, thirtyDaysStr) as any;
      const monthlySales = salesRow?.count || 0;
      const suggestedRestock = Math.max(0, row.safety_stock - row.stock + Math.ceil(monthlySales * 1.5));
      return {
        type: 'frame' as const,
        id: row.id,
        name: `${row.brand} ${row.model}`,
        stock: row.stock,
        safetyStock: row.safety_stock,
        monthlySales,
        suggestedRestock,
      };
    });

  res.json([...lensAlerts, ...frameAlerts]);
});

router.get('/transactions', (req: Request, res: Response) => {
  const itemType = req.query.itemType as string;
  const year = req.query.year as string;
  const month = req.query.month as string;

  let query = 'SELECT * FROM inventory_transactions WHERE 1=1';
  const params: any[] = [];

  if (itemType) {
    query += ' AND item_type = ?';
    params.push(itemType);
  }
  if (year && month) {
    query += ` AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?`;
    params.push(year, month.padStart(2, '0'));
  }

  query += ' ORDER BY created_at DESC LIMIT 200';

  const rows = db.prepare(query).all(...params);

  const transactions = rows.map((row: any) => ({
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    itemName: row.item_name,
    changeType: row.change_type,
    quantity: row.quantity,
    stockBefore: row.stock_before,
    stockAfter: row.stock_after,
    relatedId: row.related_id,
    createdAt: row.created_at,
  }));

  res.json(transactions);
});

export default router;
