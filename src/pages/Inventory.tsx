import { useEffect, useState } from 'react';
import { Plus, AlertTriangle, Package } from 'lucide-react';
import { useStore } from '../store';

type TabType = 'lenses' | 'frames';

export default function Inventory() {
  const { lenses, frames, fetchInventory, restockLens, restockFrame } = useStore();
  const [tab, setTab] = useState<TabType>('lenses');
  const [restockModal, setRestockModal] = useState<{
    type: TabType;
    id: number;
    name: string;
  } | null>(null);
  const [restockQty, setRestockQty] = useState('');

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setTab('lenses')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'lenses'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            镜片库存
          </button>
          <button
            onClick={() => setTab('frames')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'frames'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            镜架库存
          </button>
        </div>
      </div>

      {tab === 'lenses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {lenses.map((lens) => {
            const isLow = lens.stock <= lens.safetyStock;
            return (
              <div
                key={lens.id}
                className={`card p-5 border-2 ${getStockBg(lens.stock, lens.safetyStock)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-md">
                        {lens.refractiveIndex}
                      </span>
                      {isLow && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse-soft" />
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-800 mt-2">{lens.name}</h4>
                  </div>
                  <button
                    onClick={() =>
                      setRestockModal({ type: 'lenses', id: lens.id, name: lens.name })
                    }
                    className="btn-outline !py-1.5 !px-3 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    入库
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">当前库存</span>
                      <span
                        className={`font-bold ${
                          lens.stock <= lens.safetyStock ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        {lens.stock} 片
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${getStockColor(lens.stock, lens.safetyStock)} transition-all`}
                        style={{
                          width: `${Math.min(100, (lens.stock / Math.max(lens.safetyStock * 3, 10)) * 100)}%`,
                        }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-slate-400"
                        style={{
                          left: `${(lens.safetyStock / Math.max(lens.safetyStock * 3, 10)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">安全库存：{lens.safetyStock}</p>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">成本价</p>
                      <p className="text-sm font-medium text-slate-700">¥{lens.costPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">售价</p>
                      <p className="text-sm font-semibold text-accent-600">¥{lens.sellingPrice}</p>
                    </div>
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
              <div
                key={frame.id}
                className={`card p-5 border-2 ${getStockBg(frame.stock, frame.safetyStock)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span className="text-xs text-slate-500">{frame.brand}</span>
                      {isLow && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse-soft" />
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-800 mt-1">{frame.model}</h4>
                  </div>
                  <button
                    onClick={() =>
                      setRestockModal({
                        type: 'frames',
                        id: frame.id,
                        name: `${frame.brand} ${frame.model}`,
                      })
                    }
                    className="btn-outline !py-1.5 !px-3 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    入库
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-500">当前库存</span>
                      <span
                        className={`font-bold ${
                          frame.stock <= frame.safetyStock ? 'text-red-600' : 'text-slate-800'
                        }`}
                      >
                        {frame.stock} 副
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full ${getStockColor(frame.stock, frame.safetyStock)} transition-all`}
                        style={{
                          width: `${Math.min(100, (frame.stock / Math.max(frame.safetyStock * 3, 10)) * 100)}%`,
                        }}
                      />
                      <div
                        className="absolute top-0 h-full w-0.5 bg-slate-400"
                        style={{
                          left: `${(frame.safetyStock / Math.max(frame.safetyStock * 3, 10)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">安全库存：{frame.safetyStock}</p>
                  </div>

                  <div className="flex justify-between pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500">成本价</p>
                      <p className="text-sm font-medium text-slate-700">¥{frame.costPrice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">售价</p>
                      <p className="text-sm font-semibold text-accent-600">¥{frame.sellingPrice}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
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
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="input-field"
                  placeholder="请输入数量"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setRestockModal(null);
                    setRestockQty('');
                  }}
                  className="flex-1 btn-outline"
                >
                  取消
                </button>
                <button onClick={handleRestock} className="flex-1 btn-primary">
                  确认入库
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
