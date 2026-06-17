import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, Calendar, Eye, XCircle } from 'lucide-react';
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
import { customersApi } from '../utils/api';
import type { Customer, OptometryRecord } from '../../shared/types';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ customer: Customer; records: OptometryRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await customersApi.get(parseInt(id!));
      setData(result);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="card p-16 text-center text-slate-400">
        <div className="animate-pulse">加载中...</div>
      </div>
    );
  }

  const { customer, records } = data;
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
          <div className="text-right">
            <p className="text-3xl font-bold font-serif text-primary-700">{activeRecords.length}</p>
            <p className="text-sm text-slate-500">有效验光次数</p>
          </div>
        </div>
      </div>

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
    </div>
  );
}
