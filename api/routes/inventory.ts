import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import type { PurchaseOrder, PurchaseOrderItem, Supplier } from '../../shared/types.js';

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

router.get('/suppliers', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  const suppliers: Supplier[] = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
  }));
  res.json(suppliers);
});

router.post('/suppliers', (req: Request, res: Response) => {
  const { name, contactPerson, phone, address, notes } = req.body;

  if (!name) {
    res.status(400).json({ error: '供应商名称不能为空' });
    return;
  }

  const result = db.prepare(`
    INSERT INTO suppliers (name, contact_person, phone, address, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, contactPerson || '', phone || '', address || '', notes || '');

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid) as any;
  res.json({
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contact_person,
    phone: supplier.phone,
    address: supplier.address,
    notes: supplier.notes,
    createdAt: supplier.created_at,
  });
});

router.put('/suppliers/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, contactPerson, phone, address, notes } = req.body;

  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '供应商不存在' });
    return;
  }

  db.prepare(`
    UPDATE suppliers 
    SET name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        notes = COALESCE(?, notes)
    WHERE id = ?
  `).run(name, contactPerson, phone, address, notes, id);

  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any;
  res.json({
    id: supplier.id,
    name: supplier.name,
    contactPerson: supplier.contact_person,
    phone: supplier.phone,
    address: supplier.address,
    notes: supplier.notes,
    createdAt: supplier.created_at,
  });
});

router.get('/purchase-orders', (req: Request, res: Response) => {
  const status = req.query.status as string;
  const paymentStatus = req.query.paymentStatus as string;

  let query = `
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    query += ' AND po.status = ?';
    params.push(status);
  }
  if (paymentStatus) {
    query += ' AND po.payment_status = ?';
    params.push(paymentStatus);
  }

  query += ' ORDER BY po.created_at DESC';

  const rows = db.prepare(query).all(...params);

  const orders = rows.map((row: any) => {
    const items = db.prepare(`
      SELECT * FROM purchase_order_items WHERE purchase_order_id = ?
    `).all(row.id) as any[];

    return {
      id: row.id,
      status: row.status,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      orderDate: row.order_date,
      totalAmount: row.total_amount,
      paymentStatus: row.payment_status,
      paidAmount: row.paid_amount,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      items: items.map((item: any) => ({
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        itemType: item.item_type,
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity,
        costPrice: item.cost_price,
        createdAt: item.created_at,
      })),
    };
  });

  res.json(orders);
});

router.post('/purchase-orders', (req: Request, res: Response) => {
  const { items, supplierId, orderDate } = req.body as {
    items: { itemType: 'lens' | 'frame'; itemId: number; quantity: number }[];
    supplierId?: number;
    orderDate?: string;
  };

  if (!items || items.length === 0) {
    res.status(400).json({ error: '采购单至少需要一个商品' });
    return;
  }

  const today = new Date().toISOString().slice(0, 10);

  const tx = db.transaction(() => {
    const poResult = db.prepare(`
      INSERT INTO purchase_orders (status, supplier_id, order_date, payment_status, paid_amount)
      VALUES ('pending', ?, ?, 'unpaid', 0)
    `).run(supplierId || null, orderDate || today);
    const poId = poResult.lastInsertRowid;

    let totalAmount = 0;
    const insertItem = db.prepare(`
      INSERT INTO purchase_order_items 
      (purchase_order_id, item_type, item_id, item_name, quantity, cost_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    items.forEach((item) => {
      let itemName = '';
      let costPrice = 0;

      if (item.itemType === 'lens') {
        const lens = db.prepare('SELECT * FROM lens_inventory WHERE id = ?').get(item.itemId) as any;
        if (!lens) throw new Error(`镜片 ID ${item.itemId} 不存在`);
        itemName = lens.name;
        costPrice = lens.cost_price;
      } else {
        const frame = db.prepare('SELECT * FROM frame_inventory WHERE id = ?').get(item.itemId) as any;
        if (!frame) throw new Error(`镜架 ID ${item.itemId} 不存在`);
        itemName = `${frame.brand} ${frame.model}`;
        costPrice = frame.cost_price;
      }

      if (item.quantity <= 0) throw new Error('采购数量必须大于0');

      insertItem.run(poId, item.itemType, item.itemId, itemName, item.quantity, costPrice);
      totalAmount += item.quantity * costPrice;
    });

    db.prepare('UPDATE purchase_orders SET total_amount = ? WHERE id = ?').run(totalAmount, poId);
    return poId;
  });

  try {
    const poId = tx();
    const orderRow = db.prepare(`
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.id = ?
    `).get(poId) as any;

    const items = db.prepare(`
      SELECT * FROM purchase_order_items WHERE purchase_order_id = ?
    `).all(poId) as any[];

    const order: PurchaseOrder = {
      id: orderRow.id,
      status: orderRow.status,
      supplierId: orderRow.supplier_id,
      supplierName: orderRow.supplier_name,
      orderDate: orderRow.order_date,
      totalAmount: orderRow.total_amount,
      paymentStatus: orderRow.payment_status,
      paidAmount: orderRow.paid_amount,
      createdAt: orderRow.created_at,
      completedAt: orderRow.completed_at,
      items: items.map((item: any) => ({
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        itemType: item.item_type,
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity,
        costPrice: item.cost_price,
        createdAt: item.created_at,
      })),
    };

    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message || '创建采购单失败' });
  }
});

router.put('/purchase-orders/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { supplierId, orderDate, paymentStatus, paidAmount } = req.body;

  const existing = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }

  db.prepare(`
    UPDATE purchase_orders 
    SET supplier_id = COALESCE(?, supplier_id),
        order_date = COALESCE(?, order_date),
        payment_status = COALESCE(?, payment_status),
        paid_amount = COALESCE(?, paid_amount)
    WHERE id = ?
  `).run(
    supplierId !== undefined ? supplierId : null,
    orderDate,
    paymentStatus,
    paidAmount,
    id
  );

  const orderRow = db.prepare(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `).get(id) as any;

  const items = db.prepare(`
    SELECT * FROM purchase_order_items WHERE purchase_order_id = ?
  `).all(id) as any[];

  const order: PurchaseOrder = {
    id: orderRow.id,
    status: orderRow.status,
    supplierId: orderRow.supplier_id,
    supplierName: orderRow.supplier_name,
    orderDate: orderRow.order_date,
    totalAmount: orderRow.total_amount,
    paymentStatus: orderRow.payment_status,
    paidAmount: orderRow.paid_amount,
    createdAt: orderRow.created_at,
    completedAt: orderRow.completed_at,
    items: items.map((item: any) => ({
      id: item.id,
      purchaseOrderId: item.purchase_order_id,
      itemType: item.item_type,
      itemId: item.item_id,
      itemName: item.item_name,
      quantity: item.quantity,
      costPrice: item.cost_price,
      createdAt: item.created_at,
    })),
  };

  res.json(order);
});

router.post('/purchase-orders/:id/complete', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const poRow = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;

  if (!poRow) {
    res.status(404).json({ error: '采购单不存在' });
    return;
  }
  if (poRow.status === 'completed') {
    res.status(400).json({ error: '该采购单已完成' });
    return;
  }

  const tx = db.transaction(() => {
    const items = db.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?').all(id) as any[];

    items.forEach((item) => {
      let stockBefore = 0;
      if (item.item_type === 'lens') {
        stockBefore = (db.prepare('SELECT stock FROM lens_inventory WHERE id = ?').get(item.item_id) as any).stock;
        db.prepare('UPDATE lens_inventory SET stock = stock + ? WHERE id = ?').run(item.quantity, item.item_id);
      } else {
        stockBefore = (db.prepare('SELECT stock FROM frame_inventory WHERE id = ?').get(item.item_id) as any).stock;
        db.prepare('UPDATE frame_inventory SET stock = stock + ? WHERE id = ?').run(item.quantity, item.item_id);
      }
      const stockAfter = stockBefore + item.quantity;

      db.prepare(`
        INSERT INTO inventory_transactions 
        (item_type, item_id, item_name, change_type, quantity, stock_before, stock_after, related_id)
        VALUES (?, ?, ?, 'purchase_restock', ?, ?, ?, ?)
      `).run(item.item_type, item.item_id, item.item_name, item.quantity, stockBefore, stockAfter, id);
    });

    db.prepare(`
      UPDATE purchase_orders 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(id);
  });

  try {
    tx();
    res.json({ id, success: true, message: '采购单已完成，商品已入库' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '完成采购单失败' });
  }
});

export default router;
