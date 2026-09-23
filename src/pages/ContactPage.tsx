import React, { useState } from 'react';
import { 
  MessageSquare, 
  Mail, 
  MapPin, 
  Clock, 
  Send, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ExternalLink,
  ShieldCheck,
  Instagram,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { BRAND_CONFIG } from '../data/mockData';
import { ActivePage } from '../types';

interface ContactPageProps {
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  onNavigate,
  onOpenShare,
}) => {
  const [category, setCategory] = useState('匯款對帳與後五碼核對');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName('');
      setPhone('');
      setOrderId('');
      setMessage('');
    }, 3000);
  };

  return (
    <div className="space-y-12">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title="聯絡團長客服與常見問題解答 (FAQ)"
        description="有任何關於匯款對帳、更改超商取貨門市、拆封包裝疑問或專屬周邊代購需求？歡迎透過 LINE 官方帳號、Threads 社群或客服表單隨時與我們聯繫。"
        tag="團務客服中心"
        actionText="直接前往訂單對帳"
        onActionClick={() => onNavigate('order-status')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* COMMUNICATION CHANNELS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">最即時一對一諮詢</span>
              <h4 className="text-base font-bold text-slate-900">LINE 官方帳號</h4>
              <p className="text-sm font-mono text-emerald-700 font-bold mt-1">
                @278mcove
              </p>
            </div>
            <a
              href="https://line.me/R/ti/p/@278mcove"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-emerald-700 font-semibold"
            >
              <span>點擊加入 LINE 諮詢</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <span className="font-mono text-sm">@</span>
            </div>
            <div>
              <span className="text-xs text-slate-400">官方公告與即時動態</span>
              <h4 className="text-base font-bold text-slate-900">Threads 社群</h4>
              <p className="text-sm font-mono text-slate-900 font-bold mt-1">
                ___tototoo__once
              </p>
            </div>
            <a
              href="https://www.threads.net/@___tototoo__once"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 font-semibold"
            >
              <span>前往追蹤 Threads</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">在線服務與理貨時段</span>
              <h4 className="text-base font-bold text-slate-900">客服服務時間</h4>
              <p className="text-xs text-slate-800 font-bold mt-1">
                週一至週日 11:00 - 21:00
              </p>
            </div>
            <span className="text-[11px] text-slate-500 block">
              對帳速度：匯款後 1-2 天內完成對帳
            </span>
          </div>
        </div>

        {/* CONTACT FORM & FAQ SPLIT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT CONTACT FORM (6 cols) */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                線上團務諮詢表單
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                若有訂單個別問題，請盡可能附上您的訂單編號以利快速為您調閱
              </p>
            </div>

            {submitted && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>諮詢訊息已送出！客服小幫手將於營業時間內盡速與您聯繫。</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  問題分類 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-medium"
                >
                  <option value="匯款對帳與後五碼核對">匯款對帳與後五碼核對</option>
                  <option value="更換超商取件門市">更換超商取件門市 (發貨前)</option>
                  <option value="包裝防撞與瑕疵退換回報">包裝防撞與瑕疵退換回報</option>
                  <option value="特殊周邊代購代尋許願">特殊周邊代購代尋許願</option>
                  <option value="其他團務合作事宜">其他團務合作事宜</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    您的稱呼 / 姓名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：林佩儀"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    手機號碼 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="例：0912345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  團務訂單編號 (選填)
                </label>
                <input
                  type="text"
                  placeholder="例：TW-2026-8801"
                  value={orderId}
                  onChange={e => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  留言內容詳細說明 <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="請詳述您的問題或需求，若為更換門市請直接附上欲更改的門市名稱與 6 碼店號。"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-rose-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>發送線上諮詢表單</span>
              </button>
            </form>
          </div>

          {/* RIGHT FAQ ACCORDION (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-200/60">
                FAQ KNOWLEDGE BASE
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-2">
                跟團常見問與答 (新手 ONCE 必讀)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                整理了大家最常詢問的二補、退款與拆卡機制
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {BRAND_CONFIG.faqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{faq.q}</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-rose-600' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Logistics & Delivery Policy Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white space-y-2.5 mt-6 border border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>跟團配送重要守則 (不提供自取)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                本站<strong>不提供工作室自取或面交服務</strong>。所有周邊抵台品檢後，統一使用 <strong>7-11 賣貨便</strong> 寄送。
              </p>
              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <p>• <strong>需要二補</strong>：抵台後收取二補國際運費及超商運費，隨賣貨便賣場下單取貨付款。</p>
                <p>• <strong>退款原則</strong>：若遇官方缺貨退款，如有海外跨國手續費需扣除後退款。</p>
                <p>• <strong>對帳時效</strong>：匯款並填妥末五碼後，團長於 1-2 天內完成對帳更新。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
