import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Mail, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Gift, 
  Heart,
  Package,
  Search,
  Clock,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { UserProfile, ActivePage, Order, OrderStatus } from '../types';
import { MOCK_USERS } from '../data/mockData';
import { PageHeader } from '../components/PageHeader';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  currentUser: UserProfile;
  orders: Order[];
  onSetUser: (user: UserProfile) => void;
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
}

const ORDER_FLOW_STEPS: { status: OrderStatus; label: string; badgeColor: string }[] = [
  { status: 'order_created', label: '1. 訂單成立', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { status: 'payment_verifying', label: '2. 匯款核對', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { status: 'procuring', label: '3. 官方採購中', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
  { status: 'ordered', label: '4. 已下單', badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { status: 'shipped_kr', label: '5. 已出貨', badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { status: 'warehouse', label: '6. 集運倉', badgeColor: 'bg-teal-50 text-teal-800 border-teal-200' },
  { status: 'flight_transit', label: '7. 國際航班在途中', badgeColor: 'bg-sky-50 text-sky-800 border-sky-200' },
  { status: 'taiwan_customs_sorting', label: '8. 抵台品檢理貨', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' },
  { status: 'domestic_shipping', label: '9. 超商寄送', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  orders,
  onSetUser,
  onNavigate,
  onOpenShare,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginToast, setLoginToast] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedHistoryTab, setSelectedHistoryTab] = useState<'all' | 'unpaid' | 'transit' | 'shipping'>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginToast(isRegistering ? '正在建立會員…' : '正在驗證帳號…');
    try {
      const { data, error } = isRegistering
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      if (!data.user) throw new Error('無法建立帳號，請稍後再試');
      if (isRegistering && !data.session) {
        setLoginToast('註冊完成！請到信箱點擊驗證連結，再回來登入。');
        return;
      }
      const role = ['asd0578236@gmail.com', 'nt860806@gmail.com'].includes((data.user.email || '').toLowerCase()) ? 'admin' : 'fan';
      const profile: UserProfile = {
        ...(role === 'admin' ? MOCK_USERS.admin : MOCK_USERS.fan),
        id: data.user.id,
        name: (data.user.email || '').split('@')[0],
        email: data.user.email || email,
        role,
        isLoggedIn: true,
      };
      onSetUser(profile);
      setPassword('');
      setLoginToast(isRegistering ? '註冊並登入成功' : '登入成功');
    } catch (error) {
      setLoginToast(error instanceof Error ? error.message : '登入失敗，請稍後再試');
    }
  };

  // Filter historic orders for current user
  // Matches orders by customer phone, name, email, or socialNickname, or shows recent demo orders
  const memberOrders = orders.filter(o => {
    if (currentUser.role === 'admin') return true; // admin sees all
    const nameMatch = o.customerName.toLowerCase().includes(currentUser.name.toLowerCase());
    const emailMatch = currentUser.email && o.email?.toLowerCase() === currentUser.email.toLowerCase();
    const phoneMatch = currentUser.phone && o.phone === currentUser.phone;
    const nickMatch = currentUser.socialNickname && o.socialNickname?.toLowerCase() === currentUser.socialNickname.toLowerCase();
    // Default fallback: match ONCE 桃子 / demo user
    const isDemoFan = currentUser.name.includes('桃子') || currentUser.name.includes('ONCE');
    return nameMatch || emailMatch || phoneMatch || nickMatch || isDemoFan;
  });

  const filteredHistoryOrders = memberOrders.filter(o => {
    if (selectedHistoryTab === 'unpaid' && o.paymentStatus === 'paid') return false;
    if (selectedHistoryTab === 'transit' && (o.orderStatus !== 'flight_transit' && o.orderStatus !== 'shipped_kr' && o.orderStatus !== 'warehouse')) return false;
    if (selectedHistoryTab === 'shipping' && (o.orderStatus !== 'domestic_shipping' && o.orderStatus !== 'taiwan_customs_sorting')) return false;

    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchBatch = o.batchCode.toLowerCase().includes(q);
      const matchItem = o.items.some(i => i.title.toLowerCase().includes(q) || (i.campaign && i.campaign.toLowerCase().includes(q)));
      if (!matchId && !matchBatch && !matchItem) return false;
    }
    return true;
  });

  const totalSpent = memberOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const getOrderStatusBadge = (status: OrderStatus) => {
    const step = ORDER_FLOW_STEPS.find(s => s.status === status);
    if (step) {
      return { label: step.label, badgeColor: step.badgeColor };
    }
    return { label: status, badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-10">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title="會員中心與歷史跟團訂單記錄"
        description="即時管理您的所有歷史跟團紀錄、掌握九階段出貨動態與填寫匯款後五碼。"
        tag="會員專屬空間"
        actionText="前往周邊介紹"
        onActionClick={() => onNavigate('products')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* MEMBER PROFILE & LOGIN TOGGLE CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* PROFILE SUMMARY */}
          <div className="lg:col-span-1 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-6 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center font-black text-xl shadow-md">
                  {currentUser.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{currentUser.name}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      {currentUser.role === 'admin' ? '官方團長' : '認證會員'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                </div>
              </div>

              {/* Stats overview */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="p-3 bg-white/80 rounded-2xl border border-rose-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">累積歷史訂單</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {memberOrders.length} <span className="text-xs font-normal text-slate-400">筆</span>
                  </span>
                </div>
                <div className="p-3 bg-white/80 rounded-2xl border border-rose-100 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">帳號認證狀態</span>
                  <div className="flex items-center gap-1 mt-1 text-emerald-600 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>正式啟用</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-white/70 rounded-2xl border border-rose-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>累計消費金額：</span>
                  <strong className="font-mono text-slate-900">NT$ {totalSpent.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>專屬本命藝人：</span>
                  <strong className="text-rose-600 font-bold">
                    {localStorage.getItem('my_favorite_artist') || 'TWICE'}
                  </strong>
                </div>
              </div>
              {currentUser.isLoggedIn && <button type="button" onClick={() => supabase.auth.signOut()} className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50">登出會員帳號</button>}
            </div>

          </div>

          {/* LOGIN / ACCOUNT DETAILS FORM */}
          {!currentUser.isLoggedIn && <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isRegistering ? '註冊會員' : '會員帳號登入'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRegistering ? '建立帳號後即可使用會員功能。' : '登入後可自動記錄歷史跟團訂單，無須每次輸入基本資料。'}
                  </p>
                </div>
                <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                  100% 官方正品
                </span>
              </div>

              {loginToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{loginToast}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      電子信箱 (Email)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="once.fan@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      帳號密碼
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded text-rose-600 focus:ring-rose-500" />
                    <span>保持登入狀態並同步記錄歷史訂單</span>
                  </label>
                  <span className="text-rose-600 hover:underline cursor-pointer">忘記密碼？</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>{isRegistering ? '建立會員帳號' : '安全登入'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <button type="button" className="text-rose-600 font-semibold hover:underline" onClick={() => { setIsRegistering(!isRegistering); setLoginToast(''); }}>
                {isRegistering ? '已有帳號？返回登入' : '還沒有帳號？立即註冊'}
              </button>
            </div>
          </div>}
        </div>

        {/* MEMBER HISTORICAL ORDERS SECTION (Requirement 3: 會員可以記錄所有歷史訂單) */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200/80">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  會員歷史跟團訂單記錄
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  已完整記錄您在此帳號下的所有歷史訂購、批次物流進度與付款核款狀態
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-xl text-slate-700 self-start sm:self-auto">
              共計 {memberOrders.length} 筆歷史訂單
            </span>
          </div>

          {/* Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: `全部訂單 (${memberOrders.length})` },
                { id: 'unpaid', label: '待付款/對帳' },
                { id: 'transit', label: '國際配送中' },
                { id: 'shipping', label: '抵台二補/寄件' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedHistoryTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    selectedHistoryTab === tab.id
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋訂單編號或周邊名稱..."
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-rose-500"
              />
            </div>
          </div>

          {/* Orders List */}
          {filteredHistoryOrders.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">尚無符合的歷史訂單</h4>
                <p className="text-xs text-slate-500">
                  您目前還沒有這種類別的跟團訂單，快去周邊專區挑選心儀藝人的周邊吧！
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('products')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <span>瀏覽現正進行中團務</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHistoryOrders.map(order => {
                const statusBadge = getOrderStatusBadge(order.orderStatus);
                return (
                  <div
                    key={order.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-rose-200 transition-all shadow-xs space-y-4"
                  >
                    {/* Header: Order ID, Date, Batch, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {order.id}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {order.createdAt}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          批號：{order.batchCode}
                        </span>
                        {order.campaign && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                            {order.campaign}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusBadge.badgeColor}`}>
                          {statusBadge.label}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          order.paymentStatus === 'paid' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {order.paymentStatus === 'paid' ? '已核帳' : '對帳中'}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                              <div className="text-[11px] text-slate-500">
                                規格：{item.selectedMember || '標準版'} | 數量：{item.quantity} 件
                              </div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            NT$ {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer / Summary row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl">
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span>收件人：<strong>{order.customerName}</strong></span>
                        {order.bankLastFive && (
                          <span>末五碼：<strong className="font-mono text-rose-600">{order.bankLastFive}</strong></span>
                        )}
                        {order.paymentAccount && (
                          <span className="text-slate-500">匯入：<span className="font-mono text-[11px]">{order.paymentAccount}</span></span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-4">
                        {typeof order.secondPaymentAmount === 'number' && order.secondPaymentAmount > 0 ? (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                            <span>二補金額 (賣貨便)：</span>
                            <span className="font-mono font-bold">NT$ {order.secondPaymentAmount}</span>
                          </div>
                        ) : null}
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs text-slate-500">訂單總額：</span>
                          <span className="text-base font-black font-mono text-rose-600">
                            NT$ {order.totalAmount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
