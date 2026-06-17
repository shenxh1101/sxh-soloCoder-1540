import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const year = req.query.year as string;
  const month = req.query.month as string;

  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone,
           l.name as lens_name, l.refractive_index,
           f.brand as frame_brand, f.model as frame_model
    FROM optometry_records o
    LEFT JOIN customers c ON o.customer_id = c.id
    LEFT JOIN lens_inventory l ON o.lens_id = l.id
    LEFT JOIN frame_inventory f ON o.frame_id = f.id
  `;
  const params: any[] = [];

  if (year && month) {
    query += ` WHERE strftime('%Y', o.created_at) = ? AND strftime('%m', o.created_at) = ?`;
    params.push(year, month.padStart(2, '0'));
  }

  query += ' ORDER BY o.created_at DESC LIMIT 100';

  const rows = db.prepare(query).all(...params);

  const records = rows.map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    leftSphere: row.left_sphere,
    leftCylinder: row.left_cylinder,
    leftAxis: row.left_axis,
    rightSphere: row.right_sphere,
    rightCylinder: row.right_cylinder,
    rightAxis: row.right_axis,
    pd: row.pd,
    lensId: row.lens_id,
    lensName: row.lens_name,
    refractiveIndex: row.refractive_index,
    frameId: row.frame_id,
    frameBrand: row.frame_brand,
    frameModel: row.frame_model,
    price: row.price,
    createdAt: row.created_at,
  }));

  res.json(records);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const row = db
    .prepare(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone,
              l.name as lens_name, l.refractive_index,
              f.brand as frame_brand, f.model as frame_model
       FROM optometry_records o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN lens_inventory l ON o.lens_id = l.id
       LEFT JOIN frame_inventory f ON o.frame_id = f.id
       WHERE o.id = ?`
    )
    .get(id) as any;

  if (!row) {
    res.status(404).json({ error: '验光记录不存在' });
    return;
  }

  const record = {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    leftSphere: row.left_sphere,
    leftCylinder: row.left_cylinder,
    leftAxis: row.left_axis,
    rightSphere: row.right_sphere,
    rightCylinder: row.right_cylinder,
    rightAxis: row.right_axis,
    pd: row.pd,
    lensId: row.lens_id,
    lensName: row.lens_name,
    refractiveIndex: row.refractive_index,
    frameId: row.frame_id,
    frameBrand: row.frame_brand,
    frameModel: row.frame_model,
    price: row.price,
    createdAt: row.created_at,
  };

  res.json(record);
});

router.post('/', (req: Request, res: Response) => {
  const {
    customerName,
    customerPhone,
    leftSphere,
    leftCylinder,
    leftAxis,
    rightSphere,
    rightCylinder,
    rightAxis,
    pd,
    lensId,
    frameId,
    price,
  } = req.body;

  if (!customerName || !customerPhone) {
    res.status(400).json({ error: '客户姓名和电话不能为空' });
    return;
  }

  const lens = db.prepare('SELECT * FROM lens_inventory WHERE id = ?').get(lensId) as any;
  const frame = db.prepare('SELECT * FROM frame_inventory WHERE id = ?').get(frameId) as any;

  if (!lens || lens.stock <= 0) {
    res.status(400).json({ error: '所选镜片库存不足' });
    return;
  }
  if (!frame || frame.stock <= 0) {
    res.status(400).json({ error: '所选镜架库存不足' });
    return;
  }

  const tx = db.transaction(() => {
    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(customerPhone) as any;
    if (!customer) {
      const result = db
        .prepare('INSERT INTO customers (name, phone) VALUES (?, ?)')
        .run(customerName, customerPhone);
      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    } else {
      db.prepare('UPDATE customers SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        customerName,
        customer.id
      );
    }

    db.prepare('UPDATE lens_inventory SET stock = stock - 1 WHERE id = ?').run(lensId);
    db.prepare('UPDATE frame_inventory SET stock = stock - 1 WHERE id = ?').run(frameId);

    const result = db
      .prepare(
        `INSERT INTO optometry_records 
         (customer_id, left_sphere, left_cylinder, left_axis, right_sphere, right_cylinder, right_axis, pd, lens_id, frame_id, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        customer.id,
        leftSphere,
        leftCylinder || 0,
        leftAxis || 0,
        rightSphere,
        rightCylinder || 0,
        rightAxis || 0,
        pd,
        lensId,
        frameId,
        price || 0
      );

    return result.lastInsertRowid;
  });

  try {
    const recordId = tx();
    res.json({ id: recordId, success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '保存验光记录失败' });
  }
});

export default router;
