import { useEffect, useState } from 'react';
import {
  Plus,
  AlertTriangle,
  Package,
  FileText,
  ArrowUpDown,
  ShoppingCart,
  CheckCircle,
  Download,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { exportToCSV } from '../utils/export';
import type { InventoryTransaction, InventoryAlert } from '../../shared/types';

type TabType = 'lenses' | 'frames' | 'transactions' | 'purchase-orders' | 'alerts';

export default function Inventory() {
  const {
    lenses,
    frames,
    fetchInventory,
    restockLens,
    restockFrame,
    transactions,
    fetchTransactions,
    alerts,
    fetchAlerts,
    purchaseOrders,
    fetchPurchaseOrders,
    createPurchaseOrder,
    completePurchaseOrder,
  } = useStore();
  const [tab, setTab] = useState<TabType>('lenses');
  const [restockModal, setRestockModal] = useState<{
    type: 'lenses' | 'frames';
    id: number;
    name: string;
  } | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [txFilter, setTxFilter] = useState<{ itemType: string; year: string; month: string }>({
    itemType: '',
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
  });
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [showConfirmPO, setShowConfirmPO] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (tab === 'transactions') {
      fetchTransactions(txFilter.itemType || undefined, txFilter.year, txFilter.month);
    } else if (tab === 'alerts') {
      fetchAlerts();
    } else if (tab === 'purchase-orders') {
      fetchPurchaseOrders();
    }
  }, [tab, txFilter, fetchTransactions, fetchAlerts, fetchPurchaseOrders]);

  const handleRestock = async () => {
    if (!restockModal || !restockQty || parseInt(restockQty) <= 0) return;
    try {
      if (restockModal.type === 'lenses') {
        await restockLens(restockModal.id, parseInt(restockQty));
      } else {
        await restockFrame(restockModal.id, parseInt(restockQty));
      }
      setRestockModal(null);
      setRestockQty('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getStockColor = (stock: number, safety: number) => {
    if (stock <= 0) return 'bg-red-500';
    if (stock <= safety) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStockBg = (stock: number, safety: number) => {
    if (stock <= 0) return 'border-red-200 bg-red-50/50';
    if (stock <= safety) return 'border-amber-200 bg-amber-50/50';
    return 'border-slate-200';
  };

  const changeTypeLabel: Record<string, { text: string; color: string }> = {
    sale: { text: '销售出库', color: 'bg-red-100 text-red-700' },
    restock: { text: '手动入库', color: 'bg-emerald-100 text-emerald-700' },
    void_return: { text: '作废退回', color: 'bg-amber-100 text-amber-700' },
    exchange_return: { text: '换货退回', color: 'bg-blue-100 text-blue-700' },
    exchange_sale: { text: '换货出库', color: 'bg-orange-100 text-orange-700' },
    purchase_restock: { text: '采购入库', color: 'bg-purple-100 text-purple-700' },
  };

  const toggleAlert = (alertKey: string) => {
    setSelectedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertKey)) {
        next.delete(alertKey);
      } else {
        next.add(alertKey);
      }
      return next;
    });
  };

  const handleCreatePO = async () => {
    const items = alerts
      .filter((a) => selectedAlerts.has(`${a.type}-${a.id}`))
      .map((a) => ({
        itemType: a.type,
        itemId: a.id,
        quantity: a.suggestedRestock,
      }));

    if (items.length === 0) {
      alert('请至少选择一个商品');
      return;
    }

    try {
      await createPurchaseOrder(items);
      setSelectedAlerts(new Set());
      setShowConfirmPO(false);
      setTab('purchase-orders');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleExportTransactions = () => {
    const exportData = transactions.map((tx) => ({
      id: tx.id,
      date: new Date(tx.createdAt).toLocaleString('zh-CN'),
      itemType: tx.itemType === 'lens' ? '镜片' : '镜架',
      itemName: tx.itemName,
      changeType: changeTypeLabel[tx.changeType]?.text || tx.changeType,
      quantity: tx.quantity,
      stockBefore: tx.stockBefore,
      stockAfter: tx.stockAfter,
      relatedId: tx.relatedId || '-',
    }));

    exportToCSV(
      exportData,
      '库存流水',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['lenses', 'frames', 'alerts', 'purchase-orders', 'transactions'] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                tab === t ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {t === 'lenses' && <Package className="w-4 h-4" />}
              {t === 'frames' && <Package className="w-4 h-4" />}
              {t === 'alerts' && <AlertTriangle className="w-4 h-4" />}
              {t === 'purchase-orders' && <ShoppingCart className="w-4 h-4" />}
              {t === 'transactions' && <ArrowUpDown className="w-4 h-4" />}
              {t === 'lenses' ? '镜片库存' :
               t === 'frames' ? '镜架库存' :
               t === 'alerts' ? '补货建议' :
               t === 'purchase-orders' ? '采购单' : '出入库流水'}
            </button>
          ))}
        </div>
        {tab === 'transactions' && (
          <button onClick={handleExportTransactions} className="btn-outline flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出流水
          </button>
        )}
      </div>

      {tab === 'lenses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {lenses.map((lens) => {
            const isLow = lens.stock <= lens.safetyStock;
            return (
              <div key={lens.id} className={`card p-5 border-2 ${getStockBg(lens.stock, lens.safetyStock)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-md">{lens.refractiveIndex}</span>
                      {isLow && <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse-soft" />}
                    </div>
                    <h4 className="font-semibold text-slate-800 mt-2">{lens.name}</h4>
                  </div>
                  <button onClick={() => setRestockModal({ type: 'lenses', id: lens.id, name: lens.name })} className="btn-outline !py-1.5 !px-3 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> 入库
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">当前库存</span>
                      <span className={`font-bold ${lens.stock <= lens.safetyStock ? 'text-red-600' : 'text-slate-800'}`}>{lens.stock} 片</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className={`h-full ${getStockColor(lens.stock, lens.safetyStock)} transition-all`} style={{ width: `${Math.min(100, (lens.stock / Math.max(lens.safetyStock * 3, 10)) * 100)}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${(lens.safetyStock / Math.max(lens.safetyStock * 3, 10)) * 100}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">安全库存：{lens.safetyStock}</p>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <div><p className="text-xs text-slate-500">成本价</p><p className="text-sm font-medium text-slate-700">¥{lens.costPrice}</p></div>
                    <div><p className="text-xs text-slate-500">售价</p><p className="text-sm font-semibold text-accent-600">¥{lens.sellingPrice}</p></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'frames' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {frames.map((frame) => {
            const isLow = frame.stock <= frame.safetyStock;
            return (
              <div key={frame.id} className={`card p-5 border-2 ${getStockBg(frame.stock, frame.safetyStock)}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{frame.brand}</span>
                      {isLow && <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse-soft" />}
                    </div>
                    <h4 className="font-semibold text-slate-800 mt-1">{frame.model}</h4>
                  </div>
                  <button onClick={() => setRestockModal({ type: 'frames', id: frame.id, name: `${frame.brand} ${frame.model}` })} className="btn-outline !py-1.5 !px-3 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> 入库
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">当前库存</span>
                      <span className={`font-bold ${frame.stock <= frame.safetyStock ? 'text-red-600' : 'text-slate-800'}`}>{frame.stock} 副</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className={`h-full ${getStockColor(frame.stock, frame.safetyStock)} transition-all`} style={{ width: `${Math.min(100, (frame.stock / Math.max(frame.safetyStock * 3, 10)) * 100)}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${(frame.safetyStock / Math.max(frame.safetyStock * 3, 10)) * 100}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">安全库存：{frame.safetyStock}</p>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <div><p className="text-xs text-slate-500">成本价</p><p className="text-sm font-medium text-slate-700">¥{frame.costPrice}</p></div>
                    <div><p className="text-xs text-slate-500">售价</p><p className="text-sm font-semibold text-accent-600">¥{frame.sellingPrice}</p></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              选择需要补货的商品，点击「生成采购单」一键创建待采购清单
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (alerts.length > 0) {
                    const all = new Set(alerts.map((a) => `${a.type}-${a.id}`));
                    setSelectedAlerts(all);
                  }
                }}
                className="btn-outline !py-1.5 !px-3 text-sm"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedAlerts(new Set())}
                className="btn-outline !py-1.5 !px-3 text-sm"
              >
                清空
              </button>
              <button
                onClick={() => selectedAlerts.size > 0 && setShowConfirmPO(true)}
                disabled={selectedAlerts.size === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                生成采购单 ({selectedAlerts.size})
              </button>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="card p-16 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
              <p>库存充足，暂无补货需求</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr className="text-left text-sm text-slate-500">
                    <th className="px-5 py-3 font-medium w-12">
                      <input
                        type="checkbox"
                        checked={selectedAlerts.size === alerts.length && alerts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const all = new Set(alerts.map((a) => `${a.type}-${a.id}`));
                            setSelectedAlerts(all);
                          } else {
                            setSelectedAlerts(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">类型</th>
                    <th className="px-5 py-3 font-medium">商品</th>
                    <th className="px-5 py-3 font-medium">当前库存</th>
                    <th className="px-5 py-3 font-medium">安全库存</th>
                    <th className="px-5 py-3 font-medium">近月销量</th>
                    <th className="px-5 py-3 font-medium">建议补货</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => {
                    const key = `${alert.type}-${alert.id}`;
                    return (
                      <tr key={key} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selectedAlerts.has(key)}
                            onChange={() => toggleAlert(key)}
                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            alert.type === 'lens' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {alert.type === 'lens' ? '镜片' : '镜架'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{alert.name}</td>
                        <td className="px-5 py-3 text-sm text-red-600 font-semibold">{alert.stock}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{alert.safetyStock}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{alert.monthlySales}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-primary-600">{alert.suggestedRestock}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'purchase-orders' && (
        <div className="space-y-4">
          {purchaseOrders.length === 0 ? (
            <div className="card p-16 text-center text-slate-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>暂无采购单，去「补货建议」创建采购单</p>
            </div>
          ) : (
            purchaseOrders.map((po) => (
              <div key={po.id} className={`card p-5 border-2 ${
                po.status === 'completed' ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      po.status === 'completed' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {po.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ShoppingCart className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">采购单 #{po.id}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          po.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {po.status === 'completed' ? '已完成' : '待入库'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        创建时间：{new Date(po.createdAt).toLocaleString('zh-CN')}
                        {po.completedAt && ` · 完成时间：${new Date(po.completedAt).toLocaleString('zh-CN')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-serif text-primary-700">¥{po.totalAmount.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{po.items.length} 种商品</p>
                    {po.status === 'pending' && (
                      <button
                        onClick={() => completePurchaseOrder(po.id)}
                        className="mt-2 btn-primary !py-1.5 !px-3 text-sm"
                      >
                        确认入库
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {po.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.itemType === 'lens' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.itemType === 'lens' ? '镜片' : '镜架'}
                        </span>
                        <span className="text-sm font-medium text-slate-800">{item.itemName}</span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-slate-600">数量：<span className="font-semibold">{item.quantity}</span></span>
                        <span className="text-slate-600">成本：<span className="font-semibold">¥{item.costPrice}</span></span>
                        <span className="text-slate-600">小计：<span className="font-semibold text-primary-600">¥{(item.quantity * item.costPrice).toLocaleString()}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={txFilter.itemType} onChange={(e) => setTxFilter({ ...txFilter, itemType: e.target.value })} className="input-field w-32">
              <option value="">全部类型</option>
              <option value="lens">镜片</option>
              <option value="frame">镜架</option>
            </select>
            <select value={txFilter.year} onChange={(e) => setTxFilter({ ...txFilter, year: e.target.value })} className="input-field w-28">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select value={txFilter.month} onChange={(e) => setTxFilter({ ...txFilter, month: e.target.value })} className="input-field w-24">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-3 font-medium">时间</th>
                  <th className="px-5 py-3 font-medium">类型</th>
                  <th className="px-5 py-3 font-medium">商品</th>
                  <th className="px-5 py-3 font-medium">变动类型</th>
                  <th className="px-5 py-3 font-medium">数量变化</th>
                  <th className="px-5 py-3 font-medium">库存变化</th>
                  <th className="px-5 py-3 font-medium">关联单号</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">暂无流水记录</td></tr>
                ) : (
                  transactions.map((tx) => {
                    const ct = changeTypeLabel[tx.changeType] || { text: tx.changeType, color: 'bg-slate-100 text-slate-700' };
                    return (
                      <tr key={tx.id} className="border-t border-slate-50 hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {new Date(tx.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.itemType === 'lens' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'}`}>
                            {tx.itemType === 'lens' ? '镜片' : '镜架'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-slate-800">{tx.itemName}</td>
                        <td className="px-5 py-3 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ct.color}`}>{ct.text}</span>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold">
                          <span className={tx.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">
                          {tx.stockBefore} → {tx.stockAfter}
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-500">
                          {tx.relatedId ? `#${tx.relatedId}` : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {restockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-2">商品入库</h3>
            <p className="text-sm text-slate-500 mb-5">{restockModal.name}</p>
            <div className="space-y-4">
              <div>
                <label className="label">入库数量</label>
                <input type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} className="input-field" placeholder="请输入数量" autoFocus />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setRestockModal(null); setRestockQty(''); }} className="flex-1 btn-outline">取消</button>
                <button onClick={handleRestock} className="flex-1 btn-primary">确认入库</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmPO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-slate-800">确认生成采购单</h3>
              <button onClick={() => setShowConfirmPO(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {alerts
                .filter((a) => selectedAlerts.has(`${a.type}-${a.id}`))
                .map((alert) => (
                  <div key={`${alert.type}-${alert.id}`} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        alert.type === 'lens' ? 'bg-primary-100 text-primary-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {alert.type === 'lens' ? '镜片' : '镜架'}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{alert.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-primary-600">x{alert.suggestedRestock}</span>
                  </div>
                ))}
            </div>

            <p className="text-sm text-slate-600 mb-5">
              生成采购单后，商品到货时点击「确认入库」即可自动增加库存并记录流水。
            </p>

            <div className="flex gap-3">
              <button onClick={() => setShowConfirmPO(false)} className="flex-1 btn-outline">取消</button>
              <button onClick={handleCreatePO} className="flex-1 btn-primary">确认生成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
