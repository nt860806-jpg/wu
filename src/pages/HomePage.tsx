import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Search, 
  Truck, 
  ChevronRight,
  Heart,
  Settings2,
  Check,
  Tag
} from 'lucide-react';
import { Product, ActivePage, Artist } from '../types';
import { PageHeader } from '../components/PageHeader';
import { isProductAvailable } from '../lib/supabase';

interface HomePageProps {
  products: Product[];
  onNavigate: (page: ActivePage) => void;
  onSelectProduct: (product: Product) => void;
  onSearchOrder: (query: string) => void;
  onOpenShare: () => void;
}

const ARTIST_INFOS: Record<string, { name: string; krName: string; fandom: string; desc: string; color: string; badgeColor: string }> = {
  'TWICE': {
    name: 'TWICE',
    krName: '트와이스',
    fandom: 'ONCE',
    desc: '10週年紀念周邊、CANDYBONG ∞ 應援手燈與回歸專輯特典熱烈集單中。',
    color: 'from-rose-500 to-amber-400',
    badgeColor: 'bg-rose-100 text-rose-700 border-rose-300'
  },
  'Stray Kids': {
    name: 'Stray Kids',
    krName: '스트레이 키즈',
    fandom: 'STAY',
    desc: 'dominATE 世界巡演 Nachimbong Ver.2 手燈與官方 SKZOO 周邊專屬代購。',
    color: 'from-amber-500 to-red-600',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  'ITZY': {
    name: 'ITZY',
    krName: '있지',
    fandom: 'MIDZY',
    desc: 'Born To Be 巡迴環形手燈、官方會員限定周邊與韓國限定快閃特典。',
    color: 'from-fuchsia-500 to-pink-600',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300'
  },
  'NMIXX': {
    name: 'NMIXX',
    krName: '엔믹스',
    fandom: 'NSWER',
    desc: 'MIXXTICK 水母泡泡投影手燈、Fe3O4 通路自拍小卡與限定應援品。',
    color: 'from-sky-500 to-blue-600',
    badgeColor: 'bg-sky-100 text-sky-700 border-sky-300'
  },
  'DAY6': {
    name: 'DAY6',
    krName: '데이식스',
    fandom: 'My Day',
    desc: '十週年紀念 LIGHT BAND Ver.3 手錶手燈與回歸首週榜單專屬採購。',
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  'Xdinary Heroes': {
    name: 'Xdinary Heroes',
    krName: '엑스디너리 히어로즈',
    fandom: 'Villains',
    desc: '搖滾舞台應援周邊、首發演唱會 T-Shirt 與限定特典卡全套。',
    color: 'from-purple-600 to-indigo-700',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300'
  }
};

export const HomePage: React.FC<HomePageProps> = ({
  products,
  onNavigate,
  onSelectProduct,
  onSearchOrder,
  onOpenShare,
}) => {
  const [selectedArtistTab, setSelectedArtistTab] = useState<Artist>('ALL');
  
  // 專屬藝人專區：可以修改團體 (Requirement 8)
  const [myFavoriteArtist, setMyFavoriteArtist] = useState<Artist>(() => {
    try {
      return (localStorage.getItem('my_favorite_artist') as Artist) || 'TWICE';
    } catch {
      return 'TWICE';
    }
  });
  const [isEditingArtist, setIsEditingArtist] = useState(false);

  const handleSelectMyArtist = (artist: Artist) => {
    setMyFavoriteArtist(artist);
    try {
      localStorage.setItem('my_favorite_artist', artist);
    } catch {
      // ignore
    }
    setIsEditingArtist(false);
  };

  // Only active group buys (Requirement 9: sold_out/purchased are hidden from catalog)
  const activeProducts = products.filter(isProductAvailable);
  const filteredProducts = selectedArtistTab === 'ALL' 
    ? activeProducts 
    : activeProducts.filter(p => p.artist === selectedArtistTab);

  const myArtistInfo = ARTIST_INFOS[myFavoriteArtist] || ARTIST_INFOS['TWICE'];
  const myArtistProducts = activeProducts.filter(p => p.artist === myFavoriteArtist);

  const getArtistColor = (artist: string) => {
    switch (artist) {
      case 'TWICE': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Stray Kids': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'ITZY': return 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200';
      case 'NMIXX': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'DAY6': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Xdinary Heroes': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* 每一頁都要有頁面標題與描述 (Requirement 1: 敘述完整刪除，標題改JYP藝人官方周邊) */}
      <PageHeader
        title="JYP藝人官方周邊"
        tag="2026 最新官方團務進行中"
        actionText="瀏覽全部周邊 →"
        onActionClick={() => onNavigate('products')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* TOP SOCIAL & QUICK ACTION BAR */}
        <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://line.me/R/ti/p/@278mcove"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-semibold transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>LINE 官方帳號：<strong>@278mcove</strong></span>
            </a>
            <a
              href="https://www.threads.net/@___tototoo__once"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 text-xs sm:text-sm font-semibold transition-colors"
            >
              <span>Threads 社群：<strong>___tototoo__once</strong></span>
            </a>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>會員中心 / 訂單進度查詢</span>
            </button>
          </div>
        </section>

        {/* 專屬藝人專區（可以修改團體）(Requirement 8) */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/70 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-400 flex items-center justify-center text-white font-black shadow-lg">
                <Heart className="w-6 h-6 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">專屬藝人專區</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                    {myArtistInfo.fandom} 專屬
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  當前鎖定本命團體：<strong className="text-white text-sm">{myArtistInfo.name} ({myArtistInfo.krName})</strong>
                </p>
              </div>
            </div>

            {/* 修改團體按鈕 */}
            <button
              type="button"
              onClick={() => setIsEditingArtist(!isEditingArtist)}
              className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600 text-white text-xs sm:text-sm font-bold rounded-xl border border-slate-600 flex items-center gap-2 transition-colors self-start sm:self-auto"
            >
              <Settings2 className="w-4 h-4 text-rose-400" />
              <span>{isEditingArtist ? '收合修改選單' : '修改專屬團體'}</span>
            </button>
          </div>

          {/* 切換修改團體面板 */}
          {isEditingArtist && (
            <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">請選擇您的本命專屬藝人團體：</span>
                <span className="text-[11px] text-rose-400">點擊即刻自動切換並保存設定</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {(['TWICE', 'Stray Kids', 'ITZY', 'NMIXX', 'DAY6', 'Xdinary Heroes'] as Artist[]).map(artist => {
                  const info = ARTIST_INFOS[artist];
                  const isCurrent = myFavoriteArtist === artist;
                  return (
                    <button
                      key={artist}
                      type="button"
                      onClick={() => handleSelectMyArtist(artist)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/50'
                          : 'bg-slate-700/50 text-slate-200 border-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{artist}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <span className="text-[10px] text-slate-300 mt-1 font-mono">{info.fandom}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 專屬團體快速導覽與最新活動 */}
          <div className="grid grid-cols-1 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-rose-400" />
                <h4 className="text-sm font-bold text-white">{myArtistInfo.name} 官方重點團務動態</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{myArtistInfo.desc}</p>
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedArtistTab(myFavoriteArtist);
                    onNavigate('products');
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <span>直達 {myArtistInfo.name} 周邊專區</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-slate-400 self-center">
                  現正開放 {myArtistProducts.length} 款周邊集單
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* HOT PRODUCTS / CURRENT GROUP BUYS */}
        <section className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-200/60">
                ACTIVE GROUP BUYS
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
                現正進行中官方團務
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                限量官方特典卡送完即止，達成成團目標即刻向首爾官方鎖單
              </p>
            </div>

            {/* Artist filter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'TWICE', 'Stray Kids', 'ITZY', 'NMIXX', 'DAY6', 'Xdinary Heroes'] as Artist[]).map(artist => (
                <button
                  key={artist}
                  type="button"
                  onClick={() => setSelectedArtistTab(artist)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedArtistTab === artist
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.slice(0, 8).map(product => {
              const progressPct = Math.min(100, Math.round((product.currentUnits / product.targetUnits) * 100));
              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image & Badges */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-xs ${getArtistColor(product.artist)}`}>
                          {product.artist}
                        </span>
                        {product.status === 'closing_soon' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                            即將結單
                          </span>
                        )}
                      </div>
                      <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                        {product.category}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2.5">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                        {product.title}
                      </h3>

                      {/* POB Feature */}
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/60 leading-tight">
                        🎁 {product.pobDetail}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                          <span>已集單 {product.currentUnits} 件</span>
                          <span className="font-bold text-rose-600">{progressPct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="p-4 pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-mono line-through mr-1.5">
                          NT$ {product.originalPrice}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          NT$ {product.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <span>選成員 / 立即跟團</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <span>查看全部 JYP 藝人周邊目錄 (共 {products.length} 款)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* GROUP BUY PROCESS STEPPER */}
        <section className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              HOW IT WORKS
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              透明安心的 4 步跟團流程
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              免繁雜會員註冊即可快速下單，每一步都有專屬進度更新
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: '選定周邊與成員規格', desc: '選擇心儀藝人、款式與成員版本（可選排卡或全套特典），確認價格與截單日期。' },
              { step: '02', title: '完成轉帳填寫後五碼', desc: '支援 ATM 轉帳、LINE Pay 或線上刷卡，填寫匯款後五碼 1-2 天內自動對帳核款。' },
              { step: '03', title: '官方鎖單與國際空運', desc: '結單後由首爾官方原廠出貨，定期於官網批次物流進度更新。' },
              { step: '04', title: '抵台品檢開立賣貨便', desc: '海關清關完成後進行高標準品檢，開立 7-11 賣貨便二補專屬賣場寄出。' },
            ].map((st, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <span className="text-2xl font-black font-mono text-rose-400">{st.step}</span>
                <h3 className="text-base font-bold text-white">{st.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* BOTTOM CTA CALLOUT */}
        <section className="bg-rose-50/70 border border-rose-200/80 rounded-3xl p-8 sm:p-12 text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              準備好為你的本命應援了嗎？
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              加入 追星便利店，跟上每一次回歸與巡迴演唱會的感動！如有任何商品諮詢或特殊代購需求，歡迎隨時聯繫團長客服。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-200 transition-all"
            >
              進入周邊介紹專區選購
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold transition-colors"
            >
              聯繫客服小幫手
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
