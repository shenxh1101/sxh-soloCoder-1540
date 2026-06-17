import { useEffect } from 'react';
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
import { Eye, TrendingUp, DollarSign, Award } from 'lucide-react';
import { useStore } from '../store';

const BAR_COLORS = ['#1e40af', '#d97706', '#059669'];

export default function Statistics() {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString();

  const { monthlyStats, lensSalesStats, fetchStatistics, fetchOptometryRecords, optometryRecords } =
    useStore();

  useEffect(() => {
    fetchStatistics(year, month);
    fetchOptometryRecords(year, month);
  }, [fetchStatistics, fetchOptometryRecords, year, month]);

  const chartData = lensSalesStats.map((s) => ({
    name: `${s.refractiveIndex}`,
    销量: s.count,
    销售额: s.revenue,
  }));

  const maxSales = lensSalesStats.reduce(
    (max, s) => (s.count > max.count ? s : max),
    { refractiveIndex: '-', count: 0, revenue: 0 }
  );

  return (
    <div className="space-y-6">
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
        {optometryRecords.length === 0 ? (
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
                {optometryRecords.map((record) => (
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
    </div>
  );
}
