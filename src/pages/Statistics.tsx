import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Eye, TrendingUp, DollarSign, Award, Download, ShoppingCart, RefreshCw, Package, ArrowUpDown } from 'lucide-react';
import { useStore } from '../store';
import { exportToCSV } from '../utils/export';

const BAR_COLORS = ['#1e40af', '#d97706', '#059669'];

type TabType = 'sales' | 'reconciliation';

export default function Statistics() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear().toString());
  const [month, setMonth] = useState((now.getMonth() + 1).toString());
  const [tab, setTab] = useState<TabType>('sales');

  const {
    monthlyStats,
    lensSalesStats,
    fetchStatistics,
    fetchOptometryRecords,
    optometryRecords,
    transactions,
    fetchTransactions,
    reconciliation,
    fetchReconciliation,
  } = useStore();

  useEffect(() => {
    if (tab === 'sales') {
      fetchStatistics(year, month);
      fetchOptometryRecords(year, month, false);
    } else {
      fetchReconciliation(year, month);
      fetchTransactions(undefined, year, month);
      fetchOptometryRecords(year, month, true);
    }
  }, [tab, year, month, fetchStatistics, fetchOptometryRecords, fetchReconciliation, fetchTransactions]);

  const chartData = lensSalesStats.map((s) => ({
    name: `${s.refractiveIndex}`,
    销量: s.count,
    销售额: s.revenue,
  }));

  const maxSales = lensSalesStats.reduce(
    (max, s) => (s.count > max.count ? s : max),
    { refractiveIndex: '-', count: 0, revenue: 0 }
  );

  const handleExportSales = () => {
    const exportData = optometryRecords.map((r) => ({
      id: r.id,
      date: new Date(r.createdAt).toLocaleString('zh-CN'),
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      leftSphere: r.leftSphere,
      leftCylinder: r.leftCylinder,
      leftAxis: r.leftAxis,
      rightSphere: r.rightSphere,
      rightCylinder: r.rightCylinder,
      rightAxis: r.rightAxis,
      pd: r.pd,
      refractiveIndex: r.refractiveIndex,
      lensName: r.lensName,
      frame: `${r.frameBrand} ${r.frameModel}`,
      price: r.price,
    }));

    exportToCSV(
      exportData,
      `${year}年${month}月销售明细`,
      [
        { key: 'id', label: '单号' },
        { key: 'date', label: '时间' },
        { key: 'customerName', label: '客户姓名' },
        { key: 'customerPhone', label: '客户电话' },
        { key: 'leftSphere', label: '左眼球镜' },
        { key: 'leftCylinder', label: '左眼散光' },
        { key: 'leftAxis', label: '左眼轴位' },
        { key: 'rightSphere', label: '右眼球镜' },
        { key: 'rightCylinder', label: '右眼散光' },
        { key: 'rightAxis', label: '右眼轴位' },
        { key: 'pd', label: '瞳距' },
        { key: 'refractiveIndex', label: '折射率' },
        { key: 'lensName', label: '镜片' },
        { key: 'frame', label: '镜架' },
        { key: 'price', label: '金额' },
      ]
    );
  };

  const handleExportTransactions = () => {
    const changeTypeLabel: Record<string, string> = {
      sale: '销售出库',
      restock: '手动入库',
      void_return: '作废退回',
      exchange_return: '换货退回',
      exchange_sale: '换货出库',
      purchase_restock: '采购入库',
    };

    const exportData = transactions.map((tx) => {
      const qtySign = (tx.changeType === 'sale' || tx.changeType === 'exchange_sale') ? '-' : '+';
      return {
        id: tx.id,
        date: new Date(tx.createdAt).toLocaleString('zh-CN'),
        itemType: tx.itemType === 'lens' ? '镜片' : '镜架',
        itemName: tx.itemName,
        changeType: changeTypeLabel[tx.changeType] || tx.changeType,
        quantity: `${qtySign}${Math.abs(tx.quantity)}`,
        stockBefore: tx.stockBefore,
        stockAfter: tx.stockAfter,
        relatedId: tx.relatedId || '-',
      };
    });

    exportToCSV(
      exportData,
      `${year}年${month}月库存流水`,
      [
        { key: 'id', label: '单号' },
        { key: 'date', label: '时间' },
        { key: 'itemType', label: '类型' },
        { key: 'itemName', label: '商品' },
        { key: 'changeType', label: '变动类型' },
        { key: 'quantity', label: '数量' },
        { key: 'stockBefore', label: '变动前库存' },
        { key: 'stockAfter', label: '变动后库存' },
        { key: 'relatedId', label: '关联单号' },
      ]
    );
  };

  const handleExportReconciliation = () => {
    const changeTypeLabel: Record<string, string> = {
      sale: '销售出库',
      restock: '手动入库',
      void_return: '作废退回',
      exchange_return: '换货退回',
      exchange_sale: '换货出库',
      purchase_restock: '采购入库',
    };
    const paymentLabel: Record<string, string> = {
      unpaid: '未付款',
      partial: '部分付款',
      paid: '已付清',
    };
    const statusLabel: Record<string, string> = {
      pending: '待入库',
      completed: '已完成',
    };

    const poMap: Record<number, any> = {};
    (reconciliation?.purchaseOrders || []).forEach((po: any) => {
      poMap[po.id] = po;
    });

    const exportData: any[] = [];

    exportData.push({ type: '=== 库存流水明细 ===' });
    exportData.push({
      type: '',
      id: '流水号',
      date: '时间',
      source: '来源',
      itemType: '商品类型',
      itemName: '商品名称',
      quantity: '数量',
      stockBefore: '变动前库存',
      stockAfter: '变动后库存',
      relatedId: '关联单号',
      purchaseNo: '采购单号',
      supplier: '供应商',
      paymentStatus: '付款状态',
    });
    transactions.forEach((tx) => {
      let po: any = null;
      if (tx.changeType === 'purchase_restock' && tx.relatedId) {
        po = poMap[parseInt(String(tx.relatedId))] || null;
      }
      let qty = tx.quantity;
      if (tx.changeType !== 'sale' && tx.changeType !== 'exchange_sale') {
        qty = Math.abs(qty);
      }
      exportData.push({
        type: '',
        id: tx.id,
        date: new Date(tx.createdAt).toLocaleString('zh-CN'),
        source: changeTypeLabel[tx.changeType] || tx.changeType,
        itemType: tx.itemType === 'lens' ? '镜片' : '镜架',
        itemName: tx.itemName,
        quantity: qty,
        stockBefore: tx.stockBefore,
        stockAfter: tx.stockAfter,
        relatedId: tx.relatedId || '-',
        purchaseNo: po ? `#${po.id}` : '',
        supplier: po?.supplierName || '',
        paymentStatus: po ? (paymentLabel[po.paymentStatus] || po.paymentStatus) : '',
      });
    });

    exportData.push({ type: '' });
    exportData.push({ type: '=== 采购单明细 ===' });
    exportData.push({
      type: '',
      purchaseNo: '采购单号',
      supplier: '供应商',
      orderDate: '订货日期',
      status: '状态',
      paymentStatus: '付款状态',
      totalAmount: '应付金额',
      paidAmount: '已付金额',
      unpaidAmount: '未付金额',
    });
    (reconciliation?.purchaseOrders || []).forEach((po: any) => {
      exportData.push({
        type: '',
        purchaseNo: `#${po.id}`,
        supplier: po.supplierName || '-',
        orderDate: po.orderDate ? new Date(po.orderDate).toLocaleDateString('zh-CN') : '-',
        status: statusLabel[po.status] || po.status,
        paymentStatus: paymentLabel[po.paymentStatus] || po.paymentStatus,
        totalAmount: po.totalAmount,
        paidAmount: po.paidAmount,
        unpaidAmount: po.unpaidAmount,
      });
    });

    exportToCSV(
      exportData,
      `${year}年${month}月月度对账`,
      [
        { key: 'type', label: '' },
        { key: 'id', label: '' },
        { key: 'date', label: '' },
        { key: 'source', label: '' },
        { key: 'itemType', label: '' },
        { key: 'itemName', label: '' },
        { key: 'quantity', label: '' },
        { key: 'stockBefore', label: '' },
        { key: 'stockAfter', label: '' },
        { key: 'relatedId', label: '' },
        { key: 'purchaseNo', label: '' },
        { key: 'supplier', label: '' },
        { key: 'paymentStatus', label: '' },
        { key: 'orderDate', label: '' },
        { key: 'status', label: '' },
        { key: 'totalAmount', label: '' },
        { key: 'paidAmount', label: '' },
        { key: 'unpaidAmount', label: '' },
      ]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('sales')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            tab === 'sales'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          销售统计
        </button>
        <button
          onClick={() => setTab('reconciliation')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            tab === 'reconciliation'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          月度对账
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="input-field w-28">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="input-field w-24">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
        {tab === 'sales' ? (
          <div className="flex items-center gap-3">
            <button onClick={handleExportSales} className="btn-outline flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出销售明细
            </button>
            <button onClick={handleExportTransactions} className="btn-outline flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出库存流水
            </button>
          </div>
        ) : (
          <button onClick={handleExportReconciliation} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出对账单
          </button>
        )}
      </div>

      {tab === 'sales' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">本月配镜</p>
              <p className="text-2xl font-bold font-serif text-slate-800">
                {monthlyStats?.totalOrders || 0}
                <span className="text-sm font-normal text-slate-500 ml-1">副</span>
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">本月销售额</p>
              <p className="text-2xl font-bold font-serif text-slate-800">
                ¥{(monthlyStats?.totalRevenue || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">平均客单价</p>
              <p className="text-2xl font-bold font-serif text-slate-800">
                ¥{Math.round(monthlyStats?.averagePrice || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">最畅销镜片</p>
              <p className="text-2xl font-bold font-serif text-slate-800">
                {maxSales.refractiveIndex}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  ({maxSales.count}副)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-serif text-lg font-semibold text-slate-800 mb-6">
            各折射率镜片销量
          </h3>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无销售数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  }}
                  formatter={(value: number, name: string) =>
                    name === '销售额' ? [`¥${value.toLocaleString()}`, name] : [value, name]
                  }
                />
                <Bar dataKey="销量" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-serif text-lg font-semibold text-slate-800 mb-6">
            镜片销售明细
          </h3>
          {lensSalesStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              暂无销售数据
            </div>
          ) : (
            <div className="space-y-4">
              {lensSalesStats.map((stat, index) => {
                const total = lensSalesStats.reduce((sum, s) => sum + s.count, 0);
                const percent = total > 0 ? (stat.count / total) * 100 : 0;
                return (
                  <div key={stat.refractiveIndex}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700">
                          {stat.refractiveIndex} 折射率镜片
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-800">{stat.count} 副</span>
                        <span className="text-slate-400 mx-2">|</span>
                        <span className="font-semibold text-accent-600">
                          ¥{stat.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">占比 {percent.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">本月销售明细</h3>
        {optometryRecords.filter(r => r.status === 'active').length === 0 ? (
          <div className="py-16 text-center text-slate-400">暂无销售记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-3 font-medium">时间</th>
                  <th className="px-5 py-3 font-medium">客户</th>
                  <th className="px-5 py-3 font-medium">镜片</th>
                  <th className="px-5 py-3 font-medium">镜架</th>
                  <th className="px-5 py-3 font-medium text-right">金额</th>
                </tr>
              </thead>
              <tbody>
                {optometryRecords
                  .filter(r => r.status === 'active')
                  .map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {new Date(record.createdAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{record.customerName}</p>
                      <p className="text-xs text-slate-500">{record.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.refractiveIndex} {record.lensName}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {record.frameBrand} {record.frameModel}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-semibold text-accent-600">
                        ¥{record.price?.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

      {tab === 'reconciliation' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-primary-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">销售出库</p>
                  <p className="text-2xl font-bold font-serif text-slate-800">
                    {reconciliation?.sales?.count || 0}
                    <span className="text-sm font-normal text-slate-500 ml-1">笔</span>
                  </p>
                  <p className="text-sm text-accent-600 font-medium">
                    ¥{(reconciliation?.sales?.total || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-rose-100 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">作废退回</p>
                  <p className="text-2xl font-bold font-serif text-slate-800">
                    {reconciliation?.voided?.count || 0}
                    <span className="text-sm font-normal text-slate-500 ml-1">笔</span>
                  </p>
                  <p className="text-sm text-rose-600 font-medium">
                    ¥{(reconciliation?.voided?.total || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ArrowUpDown className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">换货调整</p>
                  <p className="text-2xl font-bold font-serif text-slate-800">
                    {(reconciliation?.inventoryTransactions?.['exchange_return']?.txCount || 0) +
                     (reconciliation?.inventoryTransactions?.['exchange_sale']?.txCount || 0)}
                    <span className="text-sm font-normal text-slate-500 ml-1">笔</span>
                  </p>
                  <p className="text-sm text-amber-600 font-medium">
                    镜片 {(reconciliation?.inventoryTransactions?.['exchange_sale']?.lensQty || 0) -
                            (reconciliation?.inventoryTransactions?.['exchange_return']?.lensQty || 0)} 片
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">采购入库</p>
                  <p className="text-2xl font-bold font-serif text-slate-800">
                    {reconciliation?.purchases?.completedCount || 0}
                    <span className="text-sm font-normal text-slate-500 ml-1">单</span>
                  </p>
                  <p className="text-sm text-emerald-600 font-medium">
                    ¥{(reconciliation?.purchases?.completedAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">
                库存流水汇总
              </h3>
              <div className="space-y-3">
                {Object.entries(reconciliation?.inventoryTransactions || {}).map(([type, data]) => {
                  const labels: Record<string, string> = {
                    sale: '销售出库',
                    restock: '手动入库',
                    void_return: '作废退回',
                    exchange_return: '换货退回',
                    exchange_sale: '换货出库',
                    purchase_restock: '采购入库',
                  };
                  const d = data as { txCount: number; lensQty: number; frameQty: number };
                  return (
                    <div key={type} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-700">{labels[type] || type}</span>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{d.txCount} 笔</span>
                        <span className="text-blue-600">镜片 {d.lensQty} 片</span>
                        <span className="text-amber-600">镜架 {d.frameQty} 副</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(reconciliation?.inventoryTransactions || {}).length === 0 && (
                  <div className="py-8 text-center text-slate-400">暂无流水数据</div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">
                采购对账
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">待处理采购单</span>
                  <span className="font-semibold text-amber-600">
                    {reconciliation?.purchases?.pendingCount || 0} 单
                    （¥{(reconciliation?.purchases?.pendingAmount || 0).toLocaleString()}）
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">已完成采购</span>
                  <span className="font-semibold text-emerald-600">
                    {reconciliation?.purchases?.completedCount || 0} 单
                    （¥{(reconciliation?.purchases?.completedAmount || 0).toLocaleString()}）
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">本月采购应付总额</span>
                    <span className="font-semibold text-slate-800">
                      ¥{(reconciliation?.purchases?.totalPayable || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">本月已付金额</span>
                    <span className="font-semibold text-emerald-600">
                      ¥{(reconciliation?.purchases?.totalPaid || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">剩余未付</span>
                    <span className="font-semibold text-rose-600 text-lg">
                      ¥{(reconciliation?.purchases?.totalUnpaid || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">
              本月流水明细（按来源分组）
            </h3>
            {transactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">暂无流水记录</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-sm text-slate-500">
                      <th className="px-5 py-3 font-medium">时间</th>
                      <th className="px-5 py-3 font-medium">来源</th>
                      <th className="px-5 py-3 font-medium">类型</th>
                      <th className="px-5 py-3 font-medium">商品</th>
                      <th className="px-5 py-3 font-medium text-right">数量</th>
                      <th className="px-5 py-3 font-medium text-right">变动后库存</th>
                      <th className="px-5 py-3 font-medium">关联单号</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const changeTypeLabel: Record<string, string> = {
                        sale: '销售出库',
                        restock: '手动入库',
                        void_return: '作废退回',
                        exchange_return: '换货退回',
                        exchange_sale: '换货出库',
                        purchase_restock: '采购入库',
                      };
                      const sourceColors: Record<string, string> = {
                        sale: 'bg-blue-100 text-blue-700',
                        restock: 'bg-slate-100 text-slate-700',
                        void_return: 'bg-rose-100 text-rose-700',
                        exchange_return: 'bg-amber-100 text-amber-700',
                        exchange_sale: 'bg-amber-100 text-amber-700',
                        purchase_restock: 'bg-emerald-100 text-emerald-700',
                      };
                      return (
                        <tr
                          key={tx.id}
                          className="border-t border-slate-50 hover:bg-slate-50"
                        >
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {new Date(tx.createdAt).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${sourceColors[tx.changeType] || 'bg-slate-100 text-slate-700'}`}>
                              {changeTypeLabel[tx.changeType] || tx.changeType}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {tx.itemType === 'lens' ? '镜片' : '镜架'}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {tx.itemName}
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-slate-700">
                            {tx.changeType === 'sale' || tx.changeType === 'exchange_sale' ? '-' : '+'}
                            {Math.abs(tx.quantity)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">
                            {tx.stockAfter}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500 font-mono">
                            {tx.relatedId || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">
              本月采购单明细
            </h3>
            {!reconciliation?.purchaseOrders || reconciliation.purchaseOrders.length === 0 ? (
              <div className="py-16 text-center text-slate-400">暂无采购单</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-sm text-slate-500">
                      <th className="px-5 py-3 font-medium">采购单号</th>
                      <th className="px-5 py-3 font-medium">供应商</th>
                      <th className="px-5 py-3 font-medium">订货日期</th>
                      <th className="px-5 py-3 font-medium">状态</th>
                      <th className="px-5 py-3 font-medium">付款状态</th>
                      <th className="px-5 py-3 font-medium text-right">应付</th>
                      <th className="px-5 py-3 font-medium text-right">已付</th>
                      <th className="px-5 py-3 font-medium text-right">未付</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.purchaseOrders.map((po: any) => {
                      const statusLabels: Record<string, { text: string; color: string }> = {
                        pending: { text: '待入库', color: 'bg-amber-100 text-amber-700' },
                        completed: { text: '已完成', color: 'bg-emerald-100 text-emerald-700' },
                      };
                      const paymentLabels: Record<string, { text: string; color: string }> = {
                        unpaid: { text: '未付款', color: 'bg-rose-100 text-rose-700' },
                        partial: { text: '部分付款', color: 'bg-amber-100 text-amber-700' },
                        paid: { text: '已付清', color: 'bg-emerald-100 text-emerald-700' },
                      };
                      const s = statusLabels[po.status] || { text: po.status, color: 'bg-slate-100 text-slate-700' };
                      const p = paymentLabels[po.paymentStatus] || { text: po.paymentStatus, color: 'bg-slate-100 text-slate-700' };
                      return (
                        <tr key={po.id} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-5 py-3 text-sm font-mono text-slate-700">#{po.id}</td>
                          <td className="px-5 py-3 text-sm text-slate-700">{po.supplierName || '-'}</td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {po.orderDate ? new Date(po.orderDate).toLocaleDateString('zh-CN') : '-'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.color}`}>{s.text}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${p.color}`}>{p.text}</span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">¥{po.totalAmount.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-sm text-emerald-600">¥{po.paidAmount.toLocaleString()}</td>
                          <td className="px-5 py-3 text-right text-sm font-semibold text-rose-600">¥{po.unpaidAmount.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
