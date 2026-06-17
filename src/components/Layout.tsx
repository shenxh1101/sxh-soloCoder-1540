import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  BarChart3,
  Glasses,
} from 'lucide-react';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/optometry', label: '验光记录', icon: FileText },
  { path: '/inventory', label: '库存管理', icon: Package },
  { path: '/customers', label: '客户管理', icon: Users },
  { path: '/statistics', label: '销售统计', icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-60 bg-gradient-to-b from-primary-800 to-primary-900 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-500 rounded-xl flex items-center justify-center">
              <Glasses className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold">视光管家</h1>
              <p className="text-xs text-primary-300">眼镜店管理系统</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-inner'
                    : 'text-primary-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-primary-700/50">
          <p className="text-xs text-primary-400">© 2026 视光管家</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8">
          <div>
            <h2 className="font-serif text-xl font-semibold text-slate-800">
              {navItems.find(
                (item) =>
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)
              )?.label || '视光管家'}
            </h2>
          </div>
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
