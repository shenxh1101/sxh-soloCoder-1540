import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FilePlus,
  PackagePlus,
  Users,
  Eye,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../store';

export default function Dashboard() {
  const { alerts, fetchAlerts, fetchInventory, fetchOptometryRecords, optometryRecords } =
    useStore();

  useEffect(() => {
    fetchAlerts();
    fetchInventory();
    fetchOptometryRecords();
  }, [fetchAlerts, fetchInventory, fetchOptometryRecords]);

  const today = new Date().toDateString();
  const todayRecords = optometryRecords.filter(
    (r) => new Date(r.createdAt).toDateString() === today
  );
  const todayRevenue = todayRecords.reduce((sum, r) => sum + (r.price || 0), 0);

  const quickActions = [
    {
      label: '新建验光单',
      icon: FilePlus,
      path: '/optometry/new',
      color: 'from-primary-600 to-primary-700',
    },
    {
      label: '库存入库',
      icon: PackagePlus,
      path: '/inventory',
      color: 'from-accent-500 to-accent-600',
    },
    {
      label: '客户查询',
      icon: Users,
      path: '/customers',
      color: 'from-emerald-500 to-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <div className="card p-5 border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse-soft" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-2">库存预警提醒</h3>
              <p className="text-sm text-red-600 mb-3">
                有 {alerts.length} 种商品库存已低于安全库存，请及时补货
              </p>
              <div className="flex flex-wrap gap-2">
                {alerts.map((alert) => (
                  <span
                    key={`${alert.type}-${alert.id}`}
                    className="px-3 py-1.5 bg-white rounded-lg text-sm border border-red-200 text-red-700"
                  >
                    {alert.name}（库存 {alert.stock}，安全值 {alert.safetyStock}）
                  </span>
                ))}
              </div>
            </div>
            <Link
              to="/inventory"
              className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
            >
              查看库存 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-gradient-to-br from-primary-700 to-primary-800 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <Eye className="w-5 h-5" />
            </div>
            <p className="text-primary-200 text-sm mb-1">今日验光</p>
            <p className="text-3xl font-bold font-serif">{todayRecords.length}</p>
            <p className="text-primary-300 text-xs mt-2">单</p>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-accent-500 to-accent-600 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-accent-100 text-sm mb-1">今日销售额</p>
            <p className="text-3xl font-bold font-serif">¥{todayRevenue.toLocaleString()}</p>
            <p className="text-accent-200 text-xs mt-2">元</p>
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mb-4">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <p className="text-emerald-100 text-sm mb-1">库存预警</p>
            <p className="text-3xl font-bold font-serif">{alerts.length}</p>
            <p className="text-emerald-200 text-xs mt-2">项待补货</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4">快捷操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.path}
                className="group flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 group-hover:text-primary-700 transition-colors">
                    {action.label}
                  </p>
                  <p className="text-sm text-slate-500">点击进入</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 ml-auto group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>

      {optometryRecords.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-slate-800">最近验光记录</h3>
            <Link
              to="/optometry"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="pb-3 font-medium">客户</th>
                  <th className="pb-3 font-medium">左眼</th>
                  <th className="pb-3 font-medium">右眼</th>
                  <th className="pb-3 font-medium">镜片</th>
                  <th className="pb-3 font-medium">金额</th>
                  <th className="pb-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {optometryRecords.slice(0, 5).map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{record.customerName}</p>
                      <p className="text-xs text-slate-500">{record.customerPhone}</p>
                    </td>
                    <td className="py-3 text-sm text-slate-600">
                      {record.leftSphere}D {record.leftCylinder ? `/${record.leftCylinder}D` : ''}
                    </td>
                    <td className="py-3 text-sm text-slate-600">
                      {record.rightSphere}D {record.rightCylinder ? `/${record.rightCylinder}D` : ''}
                    </td>
                    <td className="py-3 text-sm text-slate-600">{record.refractiveIndex}</td>
                    <td className="py-3 text-sm font-medium text-accent-600">
                      ¥{record.price?.toLocaleString()}
                    </td>
                    <td className="py-3 text-sm text-slate-500">
                      {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
