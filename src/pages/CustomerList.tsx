import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronRight, User, Phone, Calendar, AlertCircle, Clock, PhoneCall, Plus, MessageSquare } from 'lucide-react';
import { useStore } from '../store';

type TabType = 'list' | 'todo';

export default function CustomerList() {
  const navigate = useNavigate();
  const { customers, fetchCustomers, reviewTodo, fetchReviewTodo, addFollowUp } = useStore();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabType>('list');
  const [todoFilter, setTodoFilter] = useState<string>('all');
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [followUpType, setFollowUpType] = useState<'phone' | 'visit' | 'other'>('phone');
  const [followUpResult, setFollowUpResult] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');

  useEffect(() => {
    if (tab === 'list') {
      fetchCustomers(search);
    } else {
      fetchReviewTodo();
    }
  }, [tab, search, fetchCustomers, fetchReviewTodo]);

  const filteredTodo = reviewTodo.filter((c) => {
    if (todoFilter === 'all') return c.status !== 'normal';
    if (todoFilter === 'overdue') return c.status === 'overdue';
    if (todoFilter === 'upcoming') return c.status === 'upcoming';
    if (todoFilter === 'followed_up') return c.status === 'followed_up';
    return true;
  });

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    overdue: { label: '已逾期', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle },
    upcoming: { label: '即将到期', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
    followed_up: { label: '已回访未到店', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: PhoneCall },
    normal: { label: '正常', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Calendar },
  };

  const handleOpenFollowUp = (customer: any) => {
    setSelectedCustomer({ id: customer.id, name: customer.name });
    setFollowUpType('phone');
    setFollowUpResult('');
    setFollowUpNotes('');
    setShowFollowUpModal(true);
  };

  const handleAddFollowUp = async () => {
    if (!selectedCustomer || !followUpResult.trim()) {
      alert('请填写回访结果');
      return;
    }
    try {
      await addFollowUp(selectedCustomer.id, {
        type: followUpType,
        result: followUpResult,
        notes: followUpNotes,
      });
      setShowFollowUpModal(false);
      fetchReviewTodo();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleNewOptometry = (customer: any) => {
    navigate(`/optometry/new?customerId=${customer.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('list')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
            tab === 'list'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          客户列表
        </button>
        <button
          onClick={() => setTab('todo')}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors relative ${
            tab === 'todo'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          复查待办
          {reviewTodo.filter(c => c.status !== 'normal').length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {reviewTodo.filter(c => c.status !== 'normal').length}
            </span>
          )}
        </button>
      </div>

      {tab === 'list' && (
        <>
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
        </>
      )}

      {tab === 'todo' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: 'all', label: '全部待办' },
              { key: 'overdue', label: '已逾期' },
              { key: 'upcoming', label: '即将到期' },
              { key: 'followed_up', label: '已回访未到店' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTodoFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  todoFilter === f.key
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredTodo.length === 0 ? (
              <div className="card p-16 text-center text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                <p>暂无复查待办</p>
              </div>
            ) : (
              filteredTodo.map((customer) => {
                const config = statusConfig[customer.status] || statusConfig.normal;
                const Icon = config.icon;
                return (
                  <div
                    key={customer.id}
                    className="card p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-slate-800">{customer.name}</p>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                              <Icon className="w-3 h-3 inline mr-1" />
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {customer.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              上次验光：{new Date(customer.lastVisit).toLocaleDateString('zh-CN')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {customer.daysUntilReview >= 0
                                ? `${customer.daysUntilReview} 天后复查`
                                : `已逾期 ${Math.abs(customer.daysUntilReview)} 天`}
                            </span>
                          </div>
                          {customer.lastFollowUp && (
                            <p className="text-xs text-slate-400 mt-1">
                              上次回访：{new Date(customer.lastFollowUp).toLocaleString('zh-CN')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenFollowUp(customer)}
                          className="btn-outline !py-1.5 !px-3 text-sm flex items-center gap-1"
                        >
                          <MessageSquare className="w-4 h-4" />
                          记录回访
                        </button>
                        <button
                          onClick={() => handleNewOptometry(customer)}
                          className="btn-primary !py-1.5 !px-3 text-sm flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          新建验光
                        </button>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-slate-500 hover:text-primary-600 p-2"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {showFollowUpModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-slate-800">记录回访</h3>
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">客户：{selectedCustomer.name}</p>

            <div className="space-y-4">
              <div>
                <label className="label">回访方式</label>
                <div className="flex gap-2">
                  {[
                    { key: 'phone', label: '电话回访' },
                    { key: 'visit', label: '到店回访' },
                    { key: 'other', label: '其他' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setFollowUpType(t.key as any)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        followUpType === t.key
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">回访结果</label>
                <input
                  type="text"
                  value={followUpResult}
                  onChange={(e) => setFollowUpResult(e.target.value)}
                  className="input-field"
                  placeholder="例如：已联系，约好下周到店"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">备注</label>
                <textarea
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  className="input-field min-h-[80px] resize-y"
                  placeholder="可选：记录更多细节"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowFollowUpModal(false)}
                  className="flex-1 btn-outline"
                >
                  取消
                </button>
                <button onClick={handleAddFollowUp} className="flex-1 btn-primary">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
