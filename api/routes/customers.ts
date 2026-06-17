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

router.get('/review-todo', (_req: Request, res: Response) => {
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rows = db
    .prepare(
      `SELECT c.*,
         (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') as last_visit,
         (SELECT MAX(created_at) FROM follow_up_records WHERE customer_id = c.id) as last_follow_up
       FROM customers c
       WHERE (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') IS NOT NULL
       ORDER BY last_visit ASC`
    )
    .all();

  const customers = rows.map((row: any) => {
    const lastVisit = new Date(row.last_visit);
    const nextReview = new Date(lastVisit);
    nextReview.setMonth(nextReview.getMonth() + 6);
    const daysUntilReview = Math.ceil((nextReview.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let status: 'overdue' | 'upcoming' | 'followed_up' | 'normal';
    if (daysUntilReview < 0) {
      status = 'overdue';
    } else if (daysUntilReview <= 30) {
      status = 'upcoming';
    } else {
      status = 'normal';
    }

    let hasFollowUpNotVisited = false;
    if (row.last_follow_up && status !== 'normal') {
      const lastFollowUp = new Date(row.last_follow_up);
      if (lastFollowUp > lastVisit) {
        hasFollowUpNotVisited = true;
        status = 'followed_up';
      }
    }

    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      lastVisit: row.last_visit,
      nextReviewDate: nextReview.toISOString().slice(0, 10),
      daysUntilReview,
      status,
      lastFollowUp: row.last_follow_up,
      hasFollowUpNotVisited,
    };
  });

  res.json(customers);
});

router.get('/review-conversion', (req: Request, res: Response) => {
  const now = new Date();
  const year = (req.query.year as string) || now.getFullYear().toString();
  const month = (req.query.month as string) || (now.getMonth() + 1).toString();
  const monthStr = month.padStart(2, '0');
  const yearMonth = `${year}-${monthStr}`;

  const monthStart = new Date(`${yearMonth}-01T00:00:00.000Z`);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const sixMonthsAgoStart = new Date(monthStart);
  sixMonthsAgoStart.setMonth(sixMonthsAgoStart.getMonth() - 6);
  const sixMonthsAgoEnd = new Date(nextMonth);
  sixMonthsAgoEnd.setMonth(sixMonthsAgoEnd.getMonth() - 6);

  const customerRows = db.prepare(`
    SELECT DISTINCT c.id, c.name, c.phone,
           (SELECT MAX(created_at) FROM optometry_records WHERE customer_id = c.id AND status = 'active') as last_visit
    FROM customers c
    INNER JOIN optometry_records o ON o.customer_id = c.id
    WHERE o.status = 'active'
      AND o.created_at >= ?
      AND o.created_at < ?
    ORDER BY c.name
  `).all(sixMonthsAgoStart.toISOString(), sixMonthsAgoEnd.toISOString()) as any[];

  const results: any[] = [];
  for (const row of customerRows) {
    const lastVisit = row.last_visit ? new Date(row.last_visit) : null;
    const nextReview = lastVisit ? new Date(lastVisit.getTime() + 182 * 24 * 60 * 60 * 1000) : null;
    const nextReviewYM = nextReview ? nextReview.toISOString().slice(0, 7) : '';

    if (nextReviewYM !== yearMonth) continue;

    const followUps = db.prepare(`
      SELECT * FROM customer_follow_ups
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `).all(row.id) as any[];

    const hasFollowUpInWindow = followUps.some((fu: any) => {
      const fuDate = new Date(fu.created_at);
      return fuDate >= monthStart && fuDate < nextMonth;
    });

    const revisitRecord = db.prepare(`
      SELECT id FROM optometry_records
      WHERE customer_id = ? AND status = 'active' AND created_at >= ?
      LIMIT 1
    `).get(row.id, monthStart.toISOString());

    let status: 'pending' | 'followed_up' | 'revisited' | 'not_visited';
    if (revisitRecord) {
      status = 'revisited';
    } else if (hasFollowUpInWindow) {
      status = 'followed_up';
    } else if (nextReview && nextReview < now) {
      status = 'not_visited';
    } else {
      status = 'pending';
    }

    results.push({
      customerId: row.id,
      name: row.name,
      phone: row.phone,
      lastVisit: row.last_visit,
      nextReviewDate: nextReview ? nextReview.toISOString().slice(0, 10) : null,
      status,
    });
  }

  const pending = results.filter((r) => r.status === 'pending');
  const followedUp = results.filter((r) => r.status === 'followed_up');
  const revisited = results.filter((r) => r.status === 'revisited');
  const notVisited = results.filter((r) => r.status === 'not_visited');

  res.json({
    year,
    month,
    summary: {
      total: results.length,
      pending: pending.length,
      followedUp: followedUp.length,
      revisited: revisited.length,
      notVisited: notVisited.length,
    },
    customers: results,
    byStatus: {
      pending,
      followedUp,
      revisited,
      notVisited,
    },
  });
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
