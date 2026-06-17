import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, User, Phone, Calendar, ArrowLeft, Eye } from 'lucide-react';
import { useStore } from '../store';
import { customersApi } from '../utils/api';
import type { Customer, OptometryRecord } from '../../shared/types';

interface CustomerListProps {
  onSelect: (id: number) => void;
}

function CustomerList({ onSelect }: CustomerListProps) {
  const { customers, fetchCustomers } = useStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers(search);
  }, [fetchCustomers, search]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="搜索客户姓名或电话"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 w-full md:w-96"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-500">
              <th className="px-6 py-4 font-medium">客户姓名</th>
              <th className="px-6 py-4 font-medium">联系电话</th>
              <th className="px-6 py-4 font-medium">最近验光</th>
              <th className="px-6 py-4 font-medium">注册时间</th>
              <th className="px-6 py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                  暂无客户数据
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-t border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onSelect(customer.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <span className="font-medium text-slate-800">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      {customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.lastVisit
                      ? new Date(customer.lastVisit).toLocaleDateString('zh-CN')
                      : '暂无记录'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/customers/${customer.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                      查看详情 <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CustomerDetailProps {
  customerId: number;
  onBack: () => void;
}

function CustomerDetail({ customerId, onBack }: CustomerDetailProps) {
  const [data, setData] = useState<{ customer: Customer; records: OptometryRecord[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await customersApi.get(customerId);
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

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-slate-600 hover:text-primary-600 flex items-center gap-2 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        返回客户列表
      </button>

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
            <p className="text-3xl font-bold font-serif text-primary-700">{records.length}</p>
            <p className="text-sm text-slate-500">验光次数</p>
          </div>
        </div>
      </div>

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
                className="border border-slate-100 rounded-xl overflow-hidden"
              >
                <div className="bg-slate-50 px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {records.length - index}
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

export default function Customers() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (selectedId) {
    return <CustomerDetail customerId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <CustomerList onSelect={setSelectedId} />;
}
