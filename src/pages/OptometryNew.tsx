import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Eye, Package, CheckCircle } from 'lucide-react';
import { useStore } from '../store';
import { customersApi } from '../utils/api';
import type { OptometryRecord } from '../../shared/types';

interface FormState {
  customerName: string;
  customerPhone: string;
  leftSphere: string;
  leftCylinder: string;
  leftAxis: string;
  rightSphere: string;
  rightCylinder: string;
  rightAxis: string;
  pd: string;
  lensId: string;
  frameId: string;
  price: string;
}

const initialState: FormState = {
  customerName: '',
  customerPhone: '',
  leftSphere: '',
  leftCylinder: '',
  leftAxis: '',
  rightSphere: '',
  rightCylinder: '',
  rightAxis: '',
  pd: '',
  lensId: '',
  frameId: '',
  price: '',
};

export default function OptometryNew() {
  const navigate = useNavigate();
  const { lenses, frames, fetchInventory, createOptometry } = useStore();
  const [form, setForm] = useState<FormState>(initialState);
  const [existingRecords, setExistingRecords] = useState<OptometryRecord[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    if (form.customerPhone.length >= 11) {
      checkExistingCustomer();
    } else {
      setExistingRecords([]);
    }
  }, [form.customerPhone]);

  const checkExistingCustomer = async () => {
    try {
      const list = await customersApi.list(form.customerPhone);
      if (list.length > 0) {
        const customer = list[0];
        if (!form.customerName) {
          setForm((prev) => ({ ...prev, customerName: customer.name }));
        }
        const detail = await customersApi.get(customer.id);
        setExistingRecords(detail.records);
      }
    } catch {
      setExistingRecords([]);
    }
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.customerPhone) {
      setError('请填写客户姓名和电话');
      return;
    }
    if (!form.leftSphere || !form.rightSphere) {
      setError('请填写左右眼度数');
      return;
    }
    if (!form.pd) {
      setError('请填写瞳距');
      return;
    }
    if (!form.lensId || !form.frameId) {
      setError('请选择镜片和镜架');
      return;
    }

    const selectedLens = lenses.find((l) => l.id === parseInt(form.lensId));
    const selectedFrame = frames.find((f) => f.id === parseInt(form.frameId));
    const autoPrice =
      (selectedLens?.sellingPrice || 0) + (selectedFrame?.sellingPrice || 0);

    setSaving(true);
    try {
      await createOptometry({
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        leftSphere: parseFloat(form.leftSphere),
        leftCylinder: parseFloat(form.leftCylinder) || 0,
        leftAxis: parseInt(form.leftAxis) || 0,
        rightSphere: parseFloat(form.rightSphere),
        rightCylinder: parseFloat(form.rightCylinder) || 0,
        rightAxis: parseInt(form.rightAxis) || 0,
        pd: parseFloat(form.pd),
        lensId: parseInt(form.lensId),
        frameId: parseInt(form.frameId),
        price: form.price ? parseFloat(form.price) : autoPrice,
      });
      navigate('/optometry');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedLens = lenses.find((l) => l.id === parseInt(form.lensId));
  const selectedFrame = frames.find((f) => f.id === parseInt(form.frameId));
  const estimatedPrice =
    (selectedLens?.sellingPrice || 0) + (selectedFrame?.sellingPrice || 0);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-slate-600 hover:text-primary-600 flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-lg font-semibold text-slate-800">客户信息</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">客户姓名</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => updateField('customerName', e.target.value)}
                  className="input-field"
                  placeholder="请输入客户姓名"
                />
              </div>
              <div>
                <label className="label">联系电话</label>
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => updateField('customerPhone', e.target.value)}
                  className="input-field"
                  placeholder="请输入手机号"
                />
              </div>
            </div>

            {existingRecords.length > 0 && (
              <div className="mt-5 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <div className="flex items-center gap-2 text-primary-700 mb-3">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-medium text-sm">已识别为老客户，历史验光记录：</span>
                </div>
                <div className="space-y-2">
                  {existingRecords.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center text-sm bg-white rounded-lg px-3 py-2"
                    >
                      <span className="text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      <span className="text-slate-700">
                        左眼 {r.leftSphere}D / 右眼 {r.rightSphere}D
                      </span>
                      <span className="text-accent-600 font-medium">{r.refractiveIndex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Eye className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-lg font-semibold text-slate-800">验光数据</h3>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-500" />
                  左眼（L）
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="label">球镜度数 (D)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={form.leftSphere}
                      onChange={(e) => updateField('leftSphere', e.target.value)}
                      className="input-field"
                      placeholder="-2.00"
                    />
                  </div>
                  <div>
                    <label className="label">散光度数 (D)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={form.leftCylinder}
                      onChange={(e) => updateField('leftCylinder', e.target.value)}
                      className="input-field"
                      placeholder="无散光留空"
                    />
                  </div>
                  <div>
                    <label className="label">轴位 (°)</label>
                    <input
                      type="number"
                      value={form.leftAxis}
                      onChange={(e) => updateField('leftAxis', e.target.value)}
                      className="input-field"
                      placeholder="0-180"
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-accent-500" />
                  右眼（R）
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="label">球镜度数 (D)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={form.rightSphere}
                      onChange={(e) => updateField('rightSphere', e.target.value)}
                      className="input-field"
                      placeholder="-2.00"
                    />
                  </div>
                  <div>
                    <label className="label">散光度数 (D)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={form.rightCylinder}
                      onChange={(e) => updateField('rightCylinder', e.target.value)}
                      className="input-field"
                      placeholder="无散光留空"
                    />
                  </div>
                  <div>
                    <label className="label">轴位 (°)</label>
                    <input
                      type="number"
                      value={form.rightAxis}
                      onChange={(e) => updateField('rightAxis', e.target.value)}
                      className="input-field"
                      placeholder="0-180"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="label">瞳距 (mm)</label>
              <input
                type="number"
                step="0.5"
                value={form.pd}
                onChange={(e) => updateField('pd', e.target.value)}
                className="input-field max-w-[200px]"
                placeholder="62"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <Package className="w-5 h-5 text-primary-600" />
              <h3 className="font-serif text-lg font-semibold text-slate-800">商品选择</h3>
            </div>
            <div className="space-y-5">
              <div>
                <label className="label">选择镜片</label>
                <select
                  value={form.lensId}
                  onChange={(e) => updateField('lensId', e.target.value)}
                  className="input-field"
                >
                  <option value="">请选择镜片</option>
                  {lenses.map((lens) => (
                    <option key={lens.id} value={lens.id} disabled={lens.stock <= 0}>
                      {lens.name} - 库存 {lens.stock} - ¥{lens.sellingPrice}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">选择镜架</label>
                <select
                  value={form.frameId}
                  onChange={(e) => updateField('frameId', e.target.value)}
                  className="input-field"
                >
                  <option value="">请选择镜架</option>
                  {frames.map((frame) => (
                    <option key={frame.id} value={frame.id} disabled={frame.stock <= 0}>
                      {frame.brand} {frame.model} - 库存 {frame.stock} - ¥{frame.sellingPrice}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-slate-50 to-white">
            <h4 className="font-semibold text-slate-700 mb-4">价格明细</h4>
            <div className="space-y-3 text-sm">
              {selectedLens && (
                <div className="flex justify-between">
                  <span className="text-slate-600">{selectedLens.name}</span>
                  <span className="text-slate-800">¥{selectedLens.sellingPrice}</span>
                </div>
              )}
              {selectedFrame && (
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    {selectedFrame.brand} {selectedFrame.model}
                  </span>
                  <span className="text-slate-800">¥{selectedFrame.sellingPrice}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">预估总价</span>
                  <span className="text-xl font-bold text-accent-600">
                    ¥{estimatedPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <div>
                <label className="label">实际成交价（可选）</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  className="input-field"
                  placeholder={estimatedPrice.toString()}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full btn-accent py-3 text-base disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存验光单'}
          </button>
        </div>
      </div>
    </div>
  );
}
