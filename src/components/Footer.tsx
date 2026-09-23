import React from 'react';
import { Sparkles, ShieldCheck, Heart, AtSign, MapPin, Clock, MessageSquare, Instagram, ExternalLink } from 'lucide-react';
import { BRAND_CONFIG } from '../data/mockData';
import { ActivePage, UserProfile } from '../types';

interface FooterProps {
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
  currentUser?: UserProfile;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenShare, currentUser }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          {/* Brand Info (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-black text-xs">
                追星
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                追星便利店
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed pr-4">
              {BRAND_CONFIG.tagline}。致力於為每位粉絲提供最高規格、安心透明的官方周邊預購與集單服務，所有通路採購皆保證 100% 反映韓國銷量榜單。
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://threads.net"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <span>Threads: {BRAND_CONFIG.contact.threads}</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
              <button
                type="button"
                onClick={onOpenShare}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-800/60"
              >
                <Sparkles className="w-3 h-3" />
                <span>社群分享預覽</span>
              </button>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              團務快速導覽
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-rose-400 transition-colors">
                  進行中周邊集單
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('order-status')} className="hover:text-rose-400 transition-colors">
                  訂單查詢與對帳
                </button>
              </li>
              <li>
                <button type="button" onClick={() => onNavigate('shipping')} className="hover:text-rose-400 transition-colors">
                  批次海關出貨看板
                </button>
              </li>
              {currentUser?.role === 'admin' && (
                <li>
                  <button type="button" onClick={() => onNavigate('admin')} className="hover:text-rose-400 transition-colors">
                    團長管理後台
                  </button>
                </li>
              )}
              <li>
                <button type="button" onClick={() => onNavigate('login')} className="hover:text-rose-400 transition-colors">
                  會員中心
                </button>
              </li>
            </ul>
          </div>

          {/* Artists Focus */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              專屬藝人專區
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  TWICE (트와이스)
                </button>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  Stray Kids (스트레이 키즈)
                </button>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  ITZY (있지)
                </button>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  NMIXX (엔믹스)
                </button>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <button type="button" onClick={() => onNavigate('products')} className="hover:text-white transition-colors">
                  DAY6 (데이식스)
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service & Office */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              團務客服與工作室
            </h4>
            <div className="space-y-2.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-medium">LINE 官方帳號</span>
                  <span>{BRAND_CONFIG.contact.lineId}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AtSign className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-medium">Threads 官方社群</span>
                  <span>{BRAND_CONFIG.contact.threads}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-white block font-medium">服務時間</span>
                  <span>{BRAND_CONFIG.contact.serviceHours}</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium text-center transition-colors block"
                >
                  前往客服與常見問題 →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="max-w-2xl text-center md:text-left leading-relaxed">
            <p>
              © {new Date().getFullYear()} 追星便利店 官方藝人周邊集單所. 保留所有權利。
            </p>
            <p className="mt-1 text-slate-500 text-[11px]">
              免責聲明：本網站為台灣粉絲自主營運之專業代購與集單服務社群，並非 JYP Entertainment 官方附屬機構。所有官方周邊商標及肖像權屬原所屬經紀公司及版權方所有。
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0 text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% 韓國正品直購
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 text-rose-400" />
              ONCE 用心守護
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
