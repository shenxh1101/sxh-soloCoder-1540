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

  db.prepare('UPDATE lens_inventory SET stock = stock + ? WHERE id = ?').run(quantity, id);
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

  db.prepare('UPDATE frame_inventory SET stock = stock + ? WHERE id = ?').run(quantity, id);
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
  const lensAlerts = db
    .prepare('SELECT * FROM lens_inventory WHERE stock <= safety_stock')
    .all()
    .map((row: any) => ({
      type: 'lens' as const,
      id: row.id,
      name: row.name,
      stock: row.stock,
      safetyStock: row.safety_stock,
    }));

  const frameAlerts = db
    .prepare('SELECT * FROM frame_inventory WHERE stock <= safety_stock')
    .all()
    .map((row: any) => ({
      type: 'frame' as const,
      id: row.id,
      name: `${row.brand} ${row.model}`,
      stock: row.stock,
      safetyStock: row.safety_stock,
    }));

  res.json([...lensAlerts, ...frameAlerts]);
});

export default router;
