import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { useStore } from '../store';

export default function OptometryList() {
  const { optometryRecords, fetchOptometryRecords } = useStore();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());

  useEffect(() => {
    fetchOptometryRecords(year, month);
  }, [fetchOptometryRecords, year, month]);

  const filteredRecords = optometryRecords.filter(
    (r) =>
      !search ||
      r.customerName?.includes(search) ||
      r.customerPhone?.includes(search)
  );

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
              <th className="px-6 py-4 font-medium">客户信息</th>
              <th className="px-6 py-4 font-medium">左眼度数</th>
              <th className="px-6 py-4 font-medium">右眼度数</th>
              <th className="px-6 py-4 font-medium">瞳距</th>
              <th className="px-6 py-4 font-medium">镜片</th>
              <th className="px-6 py-4 font-medium">镜架</th>
              <th className="px-6 py-4 font-medium">金额</th>
              <th className="px-6 py-4 font-medium">验光时间</th>
              <th className="px-6 py-4 font-medium"></th>
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
              filteredRecords.map((record) => (
                <tr
                  key={record.id}
                  className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{record.customerName}</p>
                    <p className="text-sm text-slate-500">{record.customerPhone}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <p>球镜 {record.leftSphere}D</p>
                    {record.leftCylinder !== 0 && (
                      <p className="text-slate-500">
                        散光 {record.leftCylinder}D × {record.leftAxis}°
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <p>球镜 {record.rightSphere}D</p>
                    {record.rightCylinder !== 0 && (
                      <p className="text-slate-500">
                        散光 {record.rightCylinder}D × {record.rightAxis}°
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.pd} mm</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{record.lensName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.frameBrand} {record.frameModel}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-accent-600">
                    ¥{record.price?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(record.createdAt).toLocaleString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/customers/${record.customerId}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                    >
                      查看客户 <ChevronRight className="w-4 h-4" />
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
