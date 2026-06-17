import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, Edit3, XCircle, Save, X } from 'lucide-react';
import { useStore } from '../store';
import type { OptometryRecord, LensInventory, FrameInventory } from '../../shared/types';

export default function OptometryList() {
  const {
    optometryRecords,
    fetchOptometryRecords,
    voidOptometry,
    updateOptometry,
    lenses,
    frames,
    fetchInventory,
  } = useStore();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [includeVoided, setIncludeVoided] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OptometryRecord | null>(null);
  const [editForm, setEditForm] = useState<Partial<OptometryRecord>>({});
  const [voidingId, setVoidingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOptometryRecords(year, month, includeVoided);
    fetchInventory();
  }, [fetchOptometryRecords, fetchInventory, year, month, includeVoided]);

  const filteredRecords = optometryRecords.filter(
    (r) =>
      !search ||
      r.customerName?.includes(search) ||
      r.customerPhone?.includes(search)
  );

  const startEdit = (record: OptometryRecord) => {
    setEditingRecord(record);
    setEditForm({
      leftSphere: record.leftSphere,
      leftCylinder: record.leftCylinder,
      leftAxis: record.leftAxis,
      rightSphere: record.rightSphere,
      rightCylinder: record.rightCylinder,
      rightAxis: record.rightAxis,
      pd: record.pd,
      price: record.price,
      lensId: record.lensId,
      frameId: record.frameId,
    });
  };

  const saveEdit = async () => {
    if (editingRecord) {
      await updateOptometry(editingRecord.id, editForm);
      setEditingRecord(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingRecord(null);
    setEditForm({});
  };

  const handleVoid = async () => {
    if (voidingId) {
      await voidOptometry(voidingId);
      setVoidingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索客户姓名或电话"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 w-72"
            />
          </div>
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVoided}
              onChange={(e) => setIncludeVoided(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-600">包含作废单</span>
          </label>
        </div>
        <Link to="/optometry/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新建验光单
        </Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-500">
              <th className="px-5 py-4 font-medium">客户信息</th>
              <th className="px-5 py-4 font-medium">左眼度数</th>
              <th className="px-5 py-4 font-medium">右眼度数</th>
              <th className="px-5 py-4 font-medium">瞳距</th>
              <th className="px-5 py-4 font-medium">镜片</th>
              <th className="px-5 py-4 font-medium">镜架</th>
              <th className="px-5 py-4 font-medium">金额</th>
              <th className="px-5 py-4 font-medium">时间</th>
              <th className="px-5 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  暂无验光记录
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const isVoided = record.status === 'voided';

                return (
                  <tr
                    key={record.id}
                    className={`border-t border-slate-50 transition-colors ${
                      isVoided ? 'bg-red-50/40 opacity-60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{record.customerName}</p>
                      <p className="text-sm text-slate-500">{record.customerPhone}</p>
                      {isVoided && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                          <XCircle className="w-3 h-3" /> 已作废
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <p>球镜 {record.leftSphere}D</p>
                      {record.leftCylinder !== 0 && (
                        <p className="text-slate-500">散光 {record.leftCylinder}D × {record.leftAxis}°</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <p>球镜 {record.rightSphere}D</p>
                      {record.rightCylinder !== 0 && (
                        <p className="text-slate-500">散光 {record.rightCylinder}D × {record.rightAxis}°</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{record.pd} mm</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{record.lensName}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {record.frameBrand} {record.frameModel}
                    </td>
                    <td className="px-5 py-4 text-sm">
                      <span className="font-semibold text-accent-600">¥{record.price?.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(record.createdAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/customers/${record.customerId}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-0.5"
                        >
                          客户 <ChevronRight className="w-3 h-3" />
                        </Link>
                        {!isVoided && (
                          <>
                            <button onClick={() => startEdit(record)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="编辑">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setVoidingId(record.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="作废">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card p-6 w-full max-w-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg font-semibold text-slate-800">编辑验光记录</h3>
              <button onClick={cancelEdit} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="font-medium text-slate-800">{editingRecord.customerName}</p>
                <p className="text-sm text-slate-500">{editingRecord.customerPhone}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-500">原镜片</p>
                <p className="font-medium text-slate-800">{editingRecord.lensName}</p>
                <p className="text-sm text-slate-500 mt-1">原镜架</p>
                <p className="font-medium text-slate-800">{editingRecord.frameBrand} {editingRecord.frameModel}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">左眼球镜</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editForm.leftSphere ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, leftSphere: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">左眼散光</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editForm.leftCylinder ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, leftCylinder: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">左眼轴位</label>
                  <input
                    type="number"
                    value={editForm.leftAxis ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, leftAxis: parseInt(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">右眼球镜</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editForm.rightSphere ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, rightSphere: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">右眼散光</label>
                  <input
                    type="number"
                    step="0.25"
                    value={editForm.rightCylinder ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, rightCylinder: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">右眼轴位</label>
                  <input
                    type="number"
                    value={editForm.rightAxis ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, rightAxis: parseInt(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">瞳距 (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editForm.pd ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, pd: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">金额 (元)</label>
                  <input
                    type="number"
                    value={editForm.price ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">更换镜片</label>
                  <select
                    value={editForm.lensId ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, lensId: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value={editingRecord.lensId}>不更换 - {editingRecord.lensName}</option>
                    {lenses.map((l) => (
                      <option key={l.id} value={l.id} disabled={l.stock <= 0}>
                        {l.name} (库存: {l.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">更换镜架</label>
                  <select
                    value={editForm.frameId ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, frameId: parseInt(e.target.value) })}
                    className="input-field"
                  >
                    <option value={editingRecord.frameId}>不更换 - {editingRecord.frameBrand} {editingRecord.frameModel}</option>
                    {frames.map((f) => (
                      <option key={f.id} value={f.id} disabled={f.stock <= 0}>
                        {f.brand} {f.model} (库存: {f.stock})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(editForm.lensId !== editingRecord.lensId || editForm.frameId !== editingRecord.frameId) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ⚠️ 更换商品后，原商品将退回库存，新商品将扣除库存，库存流水中会记录换货调整。
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-5 mt-5 border-t border-slate-100">
              <button onClick={cancelEdit} className="flex-1 btn-outline">取消</button>
              <button onClick={saveEdit} className="flex-1 btn-primary flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> 保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {voidingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-sm">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-2">确认作废</h3>
            <p className="text-sm text-slate-500 mb-1">作废后库存将自动退回，此操作不可撤销。</p>
            <p className="text-sm text-red-600 mb-5">确定要作废这条验光记录吗？</p>
            <div className="flex gap-3">
              <button onClick={() => setVoidingId(null)} className="flex-1 btn-outline">取消</button>
              <button onClick={handleVoid} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium px-5 py-2.5 rounded-lg transition-all">确认作废</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
