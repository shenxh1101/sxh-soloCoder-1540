import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, User, Phone } from 'lucide-react';
import { useStore } from '../store';

export default function CustomerList() {
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
                  className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link to={`/customers/${customer.id}`} className="flex items-center gap-3 group">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary-600" />
                      </div>
                      <span className="font-medium text-slate-800 group-hover:text-primary-700">{customer.name}</span>
                    </Link>
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
