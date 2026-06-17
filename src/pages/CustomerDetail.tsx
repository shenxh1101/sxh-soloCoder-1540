import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Eye,
  XCircle,
  Clock,
  PhoneCall,
  Plus,
  Download,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store';
import { exportToCSV } from '../utils/export';
import type { CustomerDetailResponse } from '../../shared/types';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { customerDetail, fetchCustomerDetail, addFollowUp, loading } = useStore();
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    type: 'phone' as 'phone' | 'visit' | 'other',
    result: '',
    notes: '',
  });

  useEffect(() => {
    if (id) fetchCustomerDetail(parseInt(id));
  }, [id, fetchCustomerDetail]);

  if (loading || !customerDetail) {
    return (
      <div className="card p-16 text-center text-slate-400">
        <div className="animate-pulse">加载中...</div>
      </div>
    );
  }

  const { customer, records, followUps, nextReviewDate, daysUntilReview }: CustomerDetailResponse = customerDetail;
  const activeRecords = records.filter((r) => r.status === 'active');
  const latestRecord = activeRecords[0];

  const trendData = [...activeRecords]
    .reverse()
    .map((r) => ({
      date: new Date(r.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      左眼球镜: r.leftSphere,
      右眼球镜: r.rightSphere,
      左眼散光: Math.abs(r.leftCylinder),
      右眼散光: Math.abs(r.rightCylinder),
      瞳距: r.pd,
    }));

  function handleExportHistory() {
    const exportData = records.map((r) => ({
      id: r.id,
      date: new Date(r.createdAt).toLocaleString('zh-CN'),
      status: r.status === 'active' ? '有效' : '已作废',
      leftSphere: r.leftSphere,
      leftCylinder: r.leftCylinder,
      leftAxis: r.leftAxis,
      rightSphere: r.rightSphere,
      rightCylinder: r.rightCylinder,
      rightAxis: r.rightAxis,
      pd: r.pd,
      lens: r.lensName,
      refractiveIndex: r.refractiveIndex,
      frame: `${r.frameBrand} ${r.frameModel}`,
      price: r.price,
    }));

    exportToCSV(
      exportData,
      `${customer.name}_验光历史`,
      [
        { key: 'id', label: '单号' },
        { key: 'date', label: '验光时间' },
        { key: 'status', label: '状态' },
        { key: 'leftSphere', label: '左眼球镜' },
        { key: 'leftCylinder', label: '左眼散光' },
        { key: 'leftAxis', label: '左眼轴位' },
        { key: 'rightSphere', label: '右眼球镜' },
        { key: 'rightCylinder', label: '右眼散光' },
        { key: 'rightAxis', label: '右眼轴位' },
        { key: 'pd', label: '瞳距' },
        { key: 'refractiveIndex', label: '折射率' },
        { key: 'lens', label: '镜片' },
        { key: 'frame', label: '镜架' },
        { key: 'price', label: '金额' },
      ]
    );
  }

  async function handleAddFollowUp() {
    if (!followUpForm.result.trim()) {
      alert('请填写回访结果');
      return;
    }
    try {
      await addFollowUp(parseInt(id!), followUpForm);
      setShowFollowUpModal(false);
      setFollowUpForm({ type: 'phone', result: '', notes: '' });
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/customers"
        className="text-slate-600 hover:text-primary-600 flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        返回客户列表
      </Link>

      <div className="card p-6 bg-gradient-to-r from-primary-50 to-white border-primary-100">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
            <User className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-2xl font-bold text-slate-800">{customer.name}</h2>
            <div className="flex items-center gap-5 mt-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-4 h-4 text-slate-400" />
                {customer.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400" />
                注册于 {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
          <div className="text-right flex items-center gap-4">
            <div>
              <p className="text-3xl font-bold font-serif text-primary-700">{activeRecords.length}</p>
              <p className="text-sm text-slate-500">有效验光次数</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowFollowUpModal(true)}
                className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1"
              >
                <PhoneCall className="w-4 h-4" />
                记录回访
              </button>
              <button
                onClick={handleExportHistory}
                className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                导出记录
              </button>
            </div>
          </div>
        </div>
      </div>

      {nextReviewDate && (
        <div className={`card p-5 border-2 ${
          (daysUntilReview ?? 0) <= 0
            ? 'border-red-200 bg-red-50/50'
            : (daysUntilReview ?? 0) <= 30
            ? 'border-amber-200 bg-amber-50/50'
            : 'border-emerald-200 bg-emerald-50/50'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              (daysUntilReview ?? 0) <= 0 ? 'bg-red-100' : (daysUntilReview ?? 0) <= 30 ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
              {(daysUntilReview ?? 0) <= 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (daysUntilReview ?? 0) <= 30 ? (
                <Clock className="w-6 h-6 text-amber-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">复查提醒</p>
              <p className="text-sm text-slate-600">
                建议下次复查日期：{nextReviewDate}
                {(daysUntilReview ?? 0) <= 0 && (
                  <span className="ml-2 text-red-600 font-medium">（已逾期 {Math.abs(daysUntilReview ?? 0)} 天）</span>
                )}
                {(daysUntilReview ?? 0) > 0 && (daysUntilReview ?? 0) <= 30 && (
                  <span className="ml-2 text-amber-600 font-medium">（还有 {daysUntilReview} 天）</span>
                )}
                {(daysUntilReview ?? 0) > 30 && (
                  <span className="ml-2 text-emerald-600 font-medium">（还有 {daysUntilReview} 天）</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {latestRecord && (
        <div className="card p-6 border-2 border-primary-200 bg-gradient-to-r from-primary-50/50 to-white">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">最新验光</span>
            <span className="text-sm text-slate-500">
              {new Date(latestRecord.createdAt).toLocaleString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-primary-600 font-semibold mb-1">左眼球镜</p>
              <p className="text-2xl font-bold font-serif text-slate-800">{latestRecord.leftSphere}D</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-accent-600 font-semibold mb-1">右眼球镜</p>
              <p className="text-2xl font-bold font-serif text-slate-800">{latestRecord.rightSphere}D</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-emerald-600 font-semibold mb-1">瞳距</p>
              <p className="text-2xl font-bold font-serif text-slate-800">{latestRecord.pd}mm</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl">
              <p className="text-xs text-slate-500 font-semibold mb-1">镜片/镜架</p>
              <p className="text-sm font-medium text-slate-700">{latestRecord.refractiveIndex}</p>
              <p className="text-xs text-slate-500">{latestRecord.frameBrand} {latestRecord.frameModel}</p>
            </div>
          </div>
        </div>
      )}

      {trendData.length >= 2 && (
        <div className="card p-6">
          <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-600" />
            度数变化趋势
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3">球镜度数趋势</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="左眼球镜" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="右眼球镜" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-600 mb-3">散光度数趋势</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="左眼散光" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="右眼散光" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 max-w-md">
            <h4 className="text-sm font-medium text-slate-600 mb-3">瞳距变化趋势</h4>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '13px' }} />
                <Line type="monotone" dataKey="瞳距" stroke="#059669" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary-600" />
          历史验光记录
        </h3>

        {records.length === 0 ? (
          <div className="py-16 text-center text-slate-400">暂无验光记录</div>
        ) : (
          <div className="space-y-4">
            {records.map((record, index) => (
              <div
                key={record.id}
                className={`border rounded-xl overflow-hidden ${
                  record.status === 'voided'
                    ? 'border-red-200 bg-red-50/30 opacity-70'
                    : index === 0
                    ? 'border-primary-200 bg-primary-50/30'
                    : 'border-slate-100'
                }`}
              >
                <div className="bg-slate-50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 text-white rounded-full flex items-center justify-center text-sm font-semibold ${
                      record.status === 'voided' ? 'bg-red-400' : 'bg-primary-600'
                    }`}>
                      {records.filter(r => r.status === 'active').length - records.filter(r => r.status === 'active').indexOf(record)}
                    </span>
                    <span className="font-medium text-slate-700">
                      {new Date(record.createdAt).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {record.status === 'voided' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                        <XCircle className="w-3 h-3" />
                        已作废
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">
                      镜片：<span className="text-slate-700">{record.lensName}</span>
                    </span>
                    <span className="text-slate-500">
                      镜架：
                      <span className="text-slate-700">
                        {record.frameBrand} {record.frameModel}
                      </span>
                    </span>
                    <span className="font-semibold text-accent-600">¥{record.price}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-6 p-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-primary-600 uppercase">左眼 (L)</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-slate-500">球镜：</span>
                        <span className="font-medium text-slate-800">{record.leftSphere}D</span>
                      </p>
                      {record.leftCylinder !== 0 && (
                        <p>
                          <span className="text-slate-500">散光：</span>
                          <span className="font-medium text-slate-800">
                            {record.leftCylinder}D × {record.leftAxis}°
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-accent-600 uppercase">右眼 (R)</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-slate-500">球镜：</span>
                        <span className="font-medium text-slate-800">{record.rightSphere}D</span>
                      </p>
                      {record.rightCylinder !== 0 && (
                        <p>
                          <span className="text-slate-500">散光：</span>
                          <span className="font-medium text-slate-800">
                            {record.rightCylinder}D × {record.rightAxis}°
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase">其他</p>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="text-slate-500">瞳距：</span>
                        <span className="font-medium text-slate-800">{record.pd}mm</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary-600" />
          回访记录
        </h3>

        {followUps.length === 0 ? (
          <div className="py-12 text-center text-slate-400">暂无回访记录</div>
        ) : (
          <div className="space-y-3">
            {followUps.map((fu) => (
              <div key={fu.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      fu.type === 'phone' ? 'bg-blue-100 text-blue-700' :
                      fu.type === 'visit' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {fu.type === 'phone' ? '电话回访' : fu.type === 'visit' ? '到店回访' : '其他'}
                    </span>
                    <span className="text-sm text-slate-600">{fu.result}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(fu.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                {fu.notes && (
                  <p className="mt-2 text-sm text-slate-600 bg-white rounded-lg p-3 border border-slate-100">
                    {fu.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h3 className="font-serif text-lg font-semibold text-slate-800 mb-5">记录回访</h3>
            <div className="space-y-4">
              <div>
                <label className="label">回访类型</label>
                <select
                  value={followUpForm.type}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, type: e.target.value as any })}
                  className="input-field"
                >
                  <option value="phone">电话回访</option>
                  <option value="visit">到店回访</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="label">回访结果</label>
                <input
                  type="text"
                  value={followUpForm.result}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, result: e.target.value })}
                  className="input-field"
                  placeholder="例如：已约复查、无人接听、已配镜等"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">备注</label>
                <textarea
                  value={followUpForm.notes}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                  placeholder="详细记录回访内容..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowFollowUpModal(false);
                    setFollowUpForm({ type: 'phone', result: '', notes: '' });
                  }}
                  className="flex-1 btn-outline"
                >
                  取消
                </button>
                <button onClick={handleAddFollowUp} className="flex-1 btn-primary">
                  保存记录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

