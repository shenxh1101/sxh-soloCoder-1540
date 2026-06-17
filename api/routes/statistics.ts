import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/monthly', (req: Request, res: Response) => {
  const now = new Date();
  const year = (req.query.year as string) || now.getFullYear().toString();
  const month = (req.query.month as string) || (now.getMonth() + 1).toString().padStart(2, '0');

  const row = db
    .prepare(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(price), 0) as total_revenue,
        COALESCE(AVG(price), 0) as average_price
       FROM optometry_records
       WHERE status = 'active' AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?`
    )
    .get(year, month.padStart(2, '0')) as any;

  res.json({
    totalOrders: row.total_orders || 0,
    totalRevenue: row.total_revenue || 0,
    averagePrice: row.average_price || 0,
    year,
    month,
  });
});

router.get('/lenses', (req: Request, res: Response) => {
  const now = new Date();
  const year = (req.query.year as string) || now.getFullYear().toString();
  const month = (req.query.month as string) || (now.getMonth() + 1).toString().padStart(2, '0');

  const rows = db
    .prepare(
      `SELECT 
        l.refractive_index,
        COUNT(*) as count,
        COALESCE(SUM(o.price), 0) as revenue
       FROM optometry_records o
       LEFT JOIN lens_inventory l ON o.lens_id = l.id
       WHERE o.status = 'active' AND strftime('%Y', o.created_at) = ? AND strftime('%m', o.created_at) = ?
       GROUP BY l.refractive_index
       ORDER BY l.refractive_index`
    )
    .all(year, month.padStart(2, '0'));

  const stats = rows.map((row: any) => ({
    refractiveIndex: row.refractive_index || '未知',
    count: row.count,
    revenue: row.revenue,
  }));

  res.json(stats);
});

export default router;
