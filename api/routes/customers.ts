import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import type { Customer, OptometryRecord, FollowUpRecord, CustomerDetailResponse } from '../../shared/types.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const search = (req.query.search as string) || '';
  let rows;
  if (search) {
    rows = db
      .prepare(
        `SELECT c.*, 
         (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') as last_visit
         FROM customers c 
         WHERE c.name LIKE ? OR c.phone LIKE ? 
         ORDER BY c.updated_at DESC`
      )
      .all(`%${search}%`, `%${search}%`);
  } else {
    rows = db
      .prepare(
        `SELECT c.*, 
         (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') as last_visit
         FROM customers c 
         ORDER BY c.updated_at DESC`
      )
      .all();
  }

  const customers = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastVisit: row.last_visit,
  }));

  res.json(customers);
});

router.get('/due-for-review', (_req: Request, res: Response) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsStr = sixMonthsAgo.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') as last_visit
       FROM customers c
       WHERE (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') <= ?
       ORDER BY last_visit ASC`
    )
    .all(sixMonthsStr);

  const customers = rows.map((row: any) => {
    const lastVisit = new Date(row.last_visit);
    const nextReview = new Date(lastVisit);
    nextReview.setMonth(nextReview.getMonth() + 6);
    const today = new Date();
    const daysUntilReview = Math.ceil((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      lastVisit: row.last_visit,
      nextReviewDate: nextReview.toISOString().slice(0, 10),
      daysUntilReview,
    };
  });

  res.json(customers);
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const customerRow = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;

  if (!customerRow) {
    res.status(404).json({ error: '客户不存在' });
    return;
  }

  const customer: Customer = {
    id: customerRow.id,
    name: customerRow.name,
    phone: customerRow.phone,
    createdAt: customerRow.created_at,
    updatedAt: customerRow.updated_at,
  };

  const recordsRows = db
    .prepare(
      `SELECT o.*, l.name as lens_name, l.refractive_index, f.brand as frame_brand, f.model as frame_model
       FROM optometry_records o
       LEFT JOIN lens_inventory l ON o.lens_id = l.id
       LEFT JOIN frame_inventory f ON o.frame_id = f.id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(id);

  const records: OptometryRecord[] = recordsRows.map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
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
    status: row.status,
    createdAt: row.created_at,
  }));

  const followUpRows = db
    .prepare('SELECT * FROM follow_up_records WHERE customer_id = ? ORDER BY created_at DESC')
    .all(id);

  const followUps: FollowUpRecord[] = followUpRows.map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    result: row.result,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  const lastActiveRecord = records.find((r) => r.status === 'active');
  let nextReviewDate: string | null = null;
  let daysUntilReview: number | null = null;

  if (lastActiveRecord) {
    const lastVisit = new Date(lastActiveRecord.createdAt);
    const nextReview = new Date(lastVisit);
    nextReview.setMonth(nextReview.getMonth() + 6);
    nextReviewDate = nextReview.toISOString().slice(0, 10);
    const today = new Date();
    daysUntilReview = Math.ceil((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const response: CustomerDetailResponse = {
    customer,
    records,
    followUps,
    nextReviewDate,
    daysUntilReview,
  };

  res.json(response);
});

router.get('/:id/follow-ups', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const customerExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);

  if (!customerExists) {
    res.status(404).json({ error: '客户不存在' });
    return;
  }

  const rows = db
    .prepare('SELECT * FROM follow_up_records WHERE customer_id = ? ORDER BY created_at DESC')
    .all(id);

  const followUps: FollowUpRecord[] = rows.map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    type: row.type,
    result: row.result,
    notes: row.notes,
    createdAt: row.created_at,
  }));

  res.json(followUps);
});

router.post('/:id/follow-ups', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { type, result, notes } = req.body;

  const customerExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(id);
  if (!customerExists) {
    res.status(404).json({ error: '客户不存在' });
    return;
  }

  if (!type || !result) {
    res.status(400).json({ error: '回访类型和结果不能为空' });
    return;
  }

  const insertResult = db
    .prepare(
      'INSERT INTO follow_up_records (customer_id, type, result, notes) VALUES (?, ?, ?, ?)'
    )
    .run(id, type, result, notes || '');

  const newRecord = db.prepare('SELECT * FROM follow_up_records WHERE id = ?').get(insertResult.lastInsertRowid) as any;

  res.json({
    id: newRecord.id,
    customerId: newRecord.customer_id,
    type: newRecord.type,
    result: newRecord.result,
    notes: newRecord.notes,
    createdAt: newRecord.created_at,
  });
});

router.post('/', (req: Request, res: Response) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    res.status(400).json({ error: '姓名和电话不能为空' });
    return;
  }

  const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone) as any;
  if (existing) {
    res.json({
      id: existing.id,
      name: existing.name,
      phone: existing.phone,
      createdAt: existing.created_at,
      updatedAt: existing.updated_at,
      isNew: false,
    });
    return;
  }

  const result = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(name, phone);
  const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid) as any;

  res.json({
    id: newCustomer.id,
    name: newCustomer.name,
    phone: newCustomer.phone,
    createdAt: newCustomer.created_at,
    updatedAt: newCustomer.updated_at,
    isNew: true,
  });
});

export default router;
