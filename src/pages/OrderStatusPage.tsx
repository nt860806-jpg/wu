import React, { useState } from 'react';
import { 
  Search, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  CreditCard, 
  MapPin, 
  Copy, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { PageHeader } from '../components/PageHeader';
import { BRAND_CONFIG } from '../data/mockData';
import { cleanPobDisplay } from '../utils/orderUtils';

interface OrderStatusPageProps {
  orders: Order[];
  initialSearchQuery?: string;
  onUpdateOrderBankCode: (orderId: string, bankLastFive: string) => void;
  onOpenShare: () => void;
}

export const OrderStatusPage: React.FC<OrderStatusPageProps> = ({
  orders,
  initialSearchQuery = '',
  onUpdateOrderBankCode,
  onOpenShare,
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(
    orders.find(o => o.id === initialSearchQuery || o.phone === initialSearchQuery) || orders[0] || null
  );
  const [bankInput, setBankInput] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    const found = orders.find(
      o => o.id.toLowerCase() === query || o.phone.replace(/[^0-9]/g, '') === query.replace(/[^0-9]/g, '')
    );
    setSearchedOrder(found || null);
  };

  const handleQuickPickOrder = (orderId: string) => {
    setSearchInput(orderId);
    const found = orders.find(o => o.id === orderId);
    if (found) setSearchedOrder(found);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedOrder || !bankInput.trim() || bankInput.length < 4) return;
    onUpdateOrderBankCode(searchedOrder.id, bankInput.trim());
    setSubmittingBank(true);
    setTimeout(() => {
      setSubmittingBank(false);
      setBankInput('');
    }, 1500);
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  // Helper for order status badge
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'order_created':
      case 'pending_payment':
        return { text: '1. 訂單成立 (等待轉帳)', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'payment_verifying':
      case 'paid_verifying':
        return { text: '2. 匯款核對中 (1-2天內完成對帳)', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'procuring':
        return { text: '3. 官方採購中 (鎖定通路特典)', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'ordered':
      case 'purchased_official':
        return { text: '4. 已下單 (韓國官網訂單已成立)', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'shipped_kr':
        return { text: '5. 已出貨 (韓國官方倉庫已發貨)', color: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'warehouse':
        return { text: '6. 集運倉 (已抵達韓國集貨倉裝箱)', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'flight_transit':
      case 'international_transit':
        return { text: '7. 國際航班在途中 (飛機航向台灣)', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'taiwan_customs_sorting':
      case 'domestic_sorting':
        return { text: '8. 抵台品檢理貨 (海關放行・加厚包裝)', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'domestic_shipping':
      case 'shipped':
        return { text: '9. 超商寄送中 (7-11 賣貨便代碼寄件)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      case 'completed':
        return { text: '已順利取件 (團務圓滿完成)', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { text: '進行中', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const stepsList: { key: string; label: string; desc: string }[] = [
    { key: 'order_created', label: '訂單成立', desc: '下單完成' },
    { key: 'payment_verifying', label: '匯款核對', desc: '1-2天對帳' },
    { key: 'procuring', label: '官方採購中', desc: '配額鎖單' },
    { key: 'ordered', label: '已下單', desc: '官網已訂購' },
    { key: 'shipped_kr', label: '已出貨', desc: '韓方庫存發出' },
    { key: 'warehouse', label: '集運倉', desc: '集運打包' },
    { key: 'flight_transit', label: '國際航班在途中', desc: '航行往台灣' },
    { key: 'taiwan_customs_sorting', label: '抵台品檢理貨', desc: '清關防撞包裝' },
    { key: 'domestic_shipping', label: '超商寄送', desc: '賣貨便寄件' },
  ];

  const getStepActiveIndex = (status: OrderStatus) => {
    switch (status) {
      case 'order_created':
      case 'pending_payment':
        return 0;
      case 'payment_verifying':
      case 'paid_verifying':
        return 1;
      case 'procuring':
        return 2;
      case 'ordered':
      case 'purchased_official':
        return 3;
      case 'shipped_kr':
        return 4;
      case 'warehouse':
        return 5;
      case 'flight_transit':
      case 'international_transit':
        return 6;
      case 'taiwan_customs_sorting':
      case 'domestic_sorting':
        return 7;
      case 'domestic_shipping':
      case 'shipped':
      case 'completed':
        return 8;
      default:
        return 1;
    }
  };

  return (
    <div className="space-y-10">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title="會員中心與即時對帳進度查詢"
        description="輸入您的團務訂單編號或訂購人手機號碼，即時查驗款項入帳狀況、提交銀行轉帳後五碼，並可查看二補金額、國際包裹清關及超商物流配送編號。"
        tag="會員中心專區"
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Search Box Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              查詢您的團務訂單
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="輸入訂單編號 (例: TW-2026-8801) 或 手機號碼 (例: 0912345678)"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500 bg-slate-50/50"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs shrink-0"
              >
                立即查詢進度
              </button>
            </div>
          </form>

          {/* Demo quick selector */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400">示範快速查詢：</span>
            {orders.slice(0, 3).map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleQuickPickOrder(o.id)}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
              >
                {o.id} ({o.customerName})
              </button>
            ))}
          </div>
        </div>

        {/* ORDER DETAILS CONTAINER */}
        {searchedOrder ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 space-y-0">
            {/* Header Banner */}
            <div className="p-6 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">訂單編號：</span>
                  <span className="text-base sm:text-lg font-black font-mono text-slate-900">
                    {searchedOrder.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyOrderId(searchedOrder.id)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200/50"
                    title="複製訂單編號"
                  >
                    {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  下單時間：{searchedOrder.createdAt} · 歸屬批次：<strong className="text-rose-600">{searchedOrder.batchCode}</strong>
                </p>
              </div>

              {/* Status Pill */}
              <div>
                {(() => {
                  const badge = getStatusBadge(searchedOrder.orderStatus);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                      <span className="w-2 h-2 rounded-full bg-current" />
                      {badge.text}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="p-6 sm:p-8 overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  團務九階段即時流轉時程
                </h4>
                <span className="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full font-medium">
                  可橫向滑動查看全部 9 階段
                </span>
              </div>
              <div className="min-w-[780px] flex items-center justify-between relative py-2">
                {/* Connecting Line */}
                <div className="absolute top-7 left-8 right-8 h-0.5 bg-slate-200 -z-0" />
                
                {stepsList.map((st, idx) => {
                  const currentActiveIdx = getStepActiveIndex(searchedOrder.orderStatus);
                  const isDone = idx < currentActiveIdx;
                  const isCurrent = idx === currentActiveIdx;

                  return (
                    <div key={st.key} className="relative z-10 flex flex-col items-center text-center max-w-[84px]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isDone
                          ? 'bg-rose-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-rose-500 text-white ring-4 ring-rose-100 font-black'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}>
                        {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[11px] font-bold mt-2 ${
                        isCurrent ? 'text-rose-600 font-extrabold' : isDone ? 'text-slate-900' : 'text-slate-400'
                      }`}>
                        {st.label}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {st.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bank Last Five Verification Box (if pending or verifying) */}
            <div className="p-6 bg-rose-50/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-600" />
                    匯款核對狀態 (1-2 天內快速對帳)：
                    {searchedOrder.bankLastFive ? (
                      <span className="text-rose-700 font-mono font-bold">
                        已登記後五碼【{searchedOrder.bankLastFive}】
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">尚未填寫匯款後五碼</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    匯款完成後請直接在此提交帳號末 5 碼，團長將於 1-2 天內核帳。需要二補，統一使用 7-11 賣貨便寄件。
                  </p>
                </div>

                {/* Inline form to submit/update last 5 */}
                <form onSubmit={handleBankSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="輸入後5碼"
                    value={bankInput}
                    onChange={e => setBankInput(e.target.value)}
                    className="w-28 px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono focus:outline-rose-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    {submittingBank ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{submittingBank ? '已更新！' : '提交核帳'}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Items Ordered List */}
            <div className="p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                本筆訂單明細 (共 {searchedOrder.items.length} 項)
              </h4>
              <div className="divide-y divide-slate-100">
                {searchedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {item.artist}
                        </span>
                        <h5 className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5">
                          {item.title}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {item.selectedMember && (
                            <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              成員款式：<strong className="text-slate-800">{item.selectedMember}</strong>
                            </span>
                          )}
                          {(item.pobPreference || searchedOrder.pobPreference) && (
                            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              特典順序：<strong>{cleanPobDisplay(item.pobPreference || searchedOrder.pobPreference)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500">數量：{item.quantity}</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        NT$ {(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recipient & Logistics Summary */}
            <div className="p-6 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-slate-600">
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1 mb-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>訂購人與配送方式：</span>
                </div>
                <p>訂購姓名：<strong className="text-slate-900">{searchedOrder.customerName}</strong></p>
                {searchedOrder.socialNickname && (
                  <p>社群暱稱：<strong className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{searchedOrder.socialNickname}</strong></p>
                )}
                <p>手機號碼：<strong className="text-slate-900 font-mono">{searchedOrder.phone}</strong></p>
                <p>配送取件：<strong className="text-emerald-700 font-medium">7-11 賣貨便寄送（抵台後開立二補賣場）</strong></p>
                {searchedOrder.pobPreference && (
                  <p>整單特典志願順序：<strong className="text-amber-800">{searchedOrder.pobPreference}</strong></p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1 mb-2">
                  <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                  <span>金額與二補說明：</span>
                </div>
                <div className="flex justify-between">
                  <span>商品小計：</span>
                  <span className="font-mono">NT$ {searchedOrder.subtotal.toLocaleString()}</span>
                </div>
                {searchedOrder.paymentAccount && (
                  <div className="flex justify-between">
                    <span>指定匯款帳號：</span>
                    <span className="font-mono text-slate-800 font-semibold">{searchedOrder.paymentAccount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>訂單總額：</span>
                  <span className="font-mono text-rose-600">NT$ {searchedOrder.totalAmount.toLocaleString()}</span>
                </div>
                {typeof searchedOrder.secondPaymentAmount === 'number' && searchedOrder.secondPaymentAmount > 0 && (
                  <div className="flex justify-between items-center p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                    <span>二補金額 (賣貨便)：</span>
                    <span className="font-mono text-sm text-amber-700">NT$ {searchedOrder.secondPaymentAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="p-2.5 bg-slate-100 rounded-lg text-[11px] text-slate-600 space-y-1 mt-2">
                  <p className="font-semibold text-slate-800">📌 跟團須知：</p>
                  <p>• 先匯總金額，二補開賣貨便收取國際與國內物流費。</p>
                  <p>• 退款如有海外手續費需扣除後退款。</p>
                  <p>• 匯款後 1-2 天內完成對帳，不提供自取服務。</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-semibold text-slate-800">查無此訂單</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              請檢查您輸入的訂單編號或手機號碼是否正確。若仍有疑問，請隨時點擊客服洽詢。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
