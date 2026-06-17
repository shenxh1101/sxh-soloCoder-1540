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

router.get('/reconciliation', (req: Request, res: Response) => {
  const now = new Date();
  const year = (req.query.year as string) || now.getFullYear().toString();
  const month = (req.query.month as string) || (now.getMonth() + 1).toString();
  const monthStr = month.padStart(2, '0');
  const yearMonth = `${year}-${monthStr}`;

  const salesRow = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total
    FROM optometry_records
    WHERE status = 'active' AND strftime('%Y-%m', created_at) = ?
  `).get(yearMonth) as any;

  const voidRow = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(price), 0) as total
    FROM optometry_records
    WHERE status = 'voided' AND strftime('%Y-%m', created_at) = ?
  `).get(yearMonth) as any;

  const txRows = db.prepare(`
    SELECT change_type, item_type,
           COUNT(*) as tx_count,
           SUM(quantity) as total_quantity
    FROM inventory_transactions
    WHERE strftime('%Y-%m', created_at) = ?
    GROUP BY change_type, item_type
    ORDER BY change_type, item_type
  `).all(yearMonth) as any[];

  const txSummary: Record<string, { txCount: number; lensQty: number; frameQty: number }> = {};
  txRows.forEach((row: any) => {
    if (!txSummary[row.change_type]) {
      txSummary[row.change_type] = { txCount: 0, lensQty: 0, frameQty: 0 };
    }
    txSummary[row.change_type].txCount += row.tx_count;
    if (row.item_type === 'lens') {
      txSummary[row.change_type].lensQty += row.total_quantity;
    } else {
      txSummary[row.change_type].frameQty += row.total_quantity;
    }
  });

  const purchaseRow = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as completed_amount,
      SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END) as unpaid_amount,
      SUM(total_amount) as total_payable,
      SUM(COALESCE(paid_amount, 0)) as total_paid
    FROM purchase_orders
    WHERE strftime('%Y-%m', order_date) = ?
  `).get(yearMonth) as any;

  const purchaseList = db.prepare(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN suppliers s ON po.supplier_id = s.id
    WHERE strftime('%Y-%m', order_date) = ?
    ORDER BY order_date DESC, created_at DESC
  `).all(yearMonth) as any[];

  const purchaseOrders = purchaseList.map((po: any) => ({
    id: po.id,
    status: po.status,
    supplierId: po.supplier_id,
    supplierName: po.supplier_name,
    orderDate: po.order_date,
    totalAmount: po.total_amount,
    paymentStatus: po.payment_status,
    paidAmount: po.paid_amount || 0,
    unpaidAmount: Math.max(0, (po.total_amount || 0) - (po.paid_amount || 0)),
    completedAt: po.completed_at,
  }));

  res.json({
    year,
    month,
    sales: {
      count: salesRow.count || 0,
      total: salesRow.total || 0,
    },
    voided: {
      count: voidRow.count || 0,
      total: voidRow.total || 0,
    },
    inventoryTransactions: txSummary,
    purchases: {
      pendingCount: purchaseRow.pending_count || 0,
      completedCount: purchaseRow.completed_count || 0,
      pendingAmount: purchaseRow.pending_amount || 0,
      completedAmount: purchaseRow.completed_amount || 0,
      unpaidAmount: purchaseRow.unpaid_amount || 0,
      totalPayable: purchaseRow.total_payable || 0,
      totalPaid: purchaseRow.total_paid || 0,
      totalUnpaid: Math.max(0, (purchaseRow.total_payable || 0) - (purchaseRow.total_paid || 0)),
    },
    purchaseOrders,
  });
});

export default router;
