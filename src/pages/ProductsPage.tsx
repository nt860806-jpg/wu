import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Flame, 
  Sparkles, 
  X, 
  Check, 
  ShieldCheck, 
  Clock, 
  Share2, 
  Plus, 
  Minus,
  Layers,
  ArrowRight,
  Tag
} from 'lucide-react';
import { Product, Artist, ProductCategory } from '../types';
import { PageHeader } from '../components/PageHeader';
import { isProductAvailable } from '../lib/supabase';

interface ProductsPageProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onAddToCart: (product: Product, member: string | undefined, qty: number) => void;
  onInstantBuy: (product: Product, member: string | undefined, qty: number) => void;
  onOpenShare: () => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onAddToCart,
  onInstantBuy,
  onOpenShare,
}) => {
  // 雙層篩選架構：第一層 Artist，第二層 Campaign (Requirement 6)
  const [selectedArtist, setSelectedArtist] = useState<Artist>('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'deadline' | 'price-asc' | 'price-desc'>('hot');

  // Detail Modal state
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  const artists: Artist[] = ['ALL', 'TWICE', 'Stray Kids', 'ITZY', 'NMIXX', 'DAY6', 'Xdinary Heroes'];
  const categories: ProductCategory[] = [
    'ALL', 
    '手燈/應援物', 
    '演唱會/巡迴周邊', 
    '回歸專輯與特典', 
    '年曆與會員禮', 
    '快閃店限定',
    '服飾生活周邊'
  ];

  // Requirement 9: 已結單的團次會自動從周邊介紹下架，但不影響後台
  // A product is hidden from front-end if status is 'sold_out', 'purchased', or 'arrived'
  const activeAvailableProducts = products.filter(isProductAvailable);

  // Dynamic campaigns based on first tier (selectedArtist)
  const availableCampaigns = Array.from(
    new Set(
      activeAvailableProducts
        .filter(p => selectedArtist === 'ALL' || p.artist === selectedArtist)
        .map(p => p.campaign)
        .filter(Boolean)
    )
  );

  const handleSelectArtist = (art: Artist) => {
    setSelectedArtist(art);
    setSelectedCampaign('ALL'); // Reset campaign whenever artist changes
  };

  // Two-tier filtering adhering strictly to Artist -> Campaign
  const filtered = activeAvailableProducts.filter(item => {
    // 第一層（根目錄/團體）Artist *
    if (selectedArtist !== 'ALL' && item.artist !== selectedArtist) return false;

    // 第二層（分類主題/批號）Campaign *
    if (selectedCampaign !== 'ALL' && item.campaign !== selectedCampaign) return false;

    // 分類篩選
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

    // 關鍵字搜尋
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchArtist = item.artist.toLowerCase().includes(q);
      const matchCampaign = item.campaign?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchArtist && !matchCampaign) return false;
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'hot') return (b.isHot ? 1 : 0) - (a.isHot ? 1 : 0);
    if (sortBy === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return 0;
  });

  const openModalForProduct = (p: Product) => {
    onSelectProduct(p);
    setSelectedMember(p.memberOptions && p.memberOptions.length > 0 ? p.memberOptions[0] : '');
    setQuantity(1);
  };

  const handleModalAddToCart = () => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct, selectedMember || undefined, quantity);
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
      onSelectProduct(null);
    }, 1200);
  };

  const handleModalInstantBuy = () => {
    if (!selectedProduct) return;
    onInstantBuy(selectedProduct, selectedMember || undefined, quantity);
    onSelectProduct(null);
  };

  return (
    <div className="space-y-10">
      {/* 頁面標題與描述 (Requirement 2) */}
      <PageHeader
        title="周邊介紹"
        description="提供 JYP 旗下藝人官方正版周邊與限定特典代購。商品截單下架前皆可隨時跟團下單，100% 韓國官方通路直送與銷量榜單計入。"
        tag="官方正版周邊"
        actionText="前往會員中心"
        onActionClick={() => window.location.hash = '#order-status'}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Search & Filters Controls */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          {/* Search bar & Sort selector */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜尋商品名稱、主題、藝人 (例: CANDYBONG, 棒球外套, SOUNDWAVE, 10th_Anniversary)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-rose-500 bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">排序方式：</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-rose-500 font-medium"
              >
                <option value="hot">🔥 熱門推薦優先</option>
                <option value="deadline">⏰ 截單倒數優先</option>
                <option value="price-asc">💵 價格由低至高</option>
                <option value="price-desc">💎 價格由高至低</option>
              </select>
            </div>
          </div>

          {/* 第一層（根目錄/團體）Artist * 篩選 (Requirement 6) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                藝人團體 (Artist) <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                當前選取：{selectedArtist}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {artists.map(art => (
                <button
                  key={art}
                  type="button"
                  onClick={() => handleSelectArtist(art)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedArtist === art
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {art}
                </button>
              ))}
            </div>
          </div>

          {/* 第二層（分類主題/批號）Campaign * 篩選 (Requirement 6) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                主題批號 (Campaign) <span className="text-rose-500">*</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedCampaign === 'ALL' ? '全部主題' : selectedCampaign}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCampaign('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCampaign === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                全部主題 (ALL)
              </button>
              {availableCampaigns.map(camp => (
                <button
                  key={camp}
                  type="button"
                  onClick={() => setSelectedCampaign(camp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all font-mono ${
                    selectedCampaign === camp
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {camp}
                </button>
              ))}
            </div>
          </div>

          {/* 輔助分類 (Category selector) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              周邊品項屬性
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Hierarchy Notification Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200 text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              已依架構篩選：
              <strong className="text-slate-900 font-mono ml-1">{selectedArtist}</strong>
              <span className="mx-1 text-slate-400">&gt;</span>
              <strong className="text-rose-600 font-mono">{selectedCampaign}</strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            ⚡ 已結單團次自動從周邊介紹即時下架
          </span>
        </div>

        {/* Products Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>現正開放跟團：共 <strong className="text-slate-900 font-bold">{sorted.length}</strong> 款官方正版周邊</span>
            <span className="hidden sm:inline">所有品項均含官方防偽標籤與首週實時計入榜單</span>
          </div>

          {sorted.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center space-y-3 border border-slate-200">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-800">查無符合條件的進行中周邊商品</p>
              <p className="text-xs text-slate-500">
                該主題之團次可能已結單下架，或請嘗試切換「全部團體」與「全部主題」重試。
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedArtist('ALL');
                  setSelectedCampaign('ALL');
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl mt-2 shadow-xs"
              >
                重設所有篩選條件
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sorted.map(product => {
                const progressPct = Math.min(100, Math.round((product.currentUnits / product.targetUnits) * 100));
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                        {/* Two-tier badge */}
                        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 text-slate-900 border border-slate-200 shadow-xs backdrop-blur-xs">
                            {product.artist}
                          </span>
                          {product.campaign && (
                            <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                              {product.campaign}
                            </span>
                          )}
                          {product.isHot && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                              熱門跟團
                            </span>
                          )}
                        </div>
                        <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded-lg backdrop-blur-xs">
                          {product.category}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                          {product.title}
                        </h3>

                        {/* Special POB Benefit Tag */}
                        <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-100 text-[11px] text-rose-900 leading-tight">
                          <strong>🎁 官方特典：</strong>{product.pobDetail}
                        </div>

                        {/* Description snippet */}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>

                        {/* Progress */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[11px] font-mono text-slate-500">
                            <span>集單進度：{product.currentUnits}/{product.targetUnits} 件</span>
                            <span className="font-bold text-rose-600">{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & CTA */}
                    <div className="p-4 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          NT$ {product.price.toLocaleString()}
                        </span>
                        {product.krwPrice && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            ₩{product.krwPrice.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openModalForProduct(product)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors"
                        >
                          商品詳情
                        </button>
                        <button
                          type="button"
                          onClick={() => openModalForProduct(product)}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <span>立即跟團</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => onSelectProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Image */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Specs */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {selectedProduct.artist}
                    </span>
                    {selectedProduct.campaign && (
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                        {selectedProduct.campaign}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {selectedProduct.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedProduct.title}
                  </h3>

                  <div className="text-xl font-extrabold text-rose-600 font-mono">
                    NT$ {selectedProduct.price.toLocaleString()}
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      <span>官方特典通路說明</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedProduct.pobDetail}</p>
                  </div>
                </div>

                {/* Member selection if available */}
                {selectedProduct.memberOptions && selectedProduct.memberOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      選擇成員款式 / 規格：
                    </label>
                    <select
                      value={selectedMember}
                      onChange={e => setSelectedMember(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-medium"
                    >
                      {selectedProduct.memberOptions.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">跟團數量：</label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-4 py-1.5 text-xs font-bold font-mono text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-xs text-slate-500">
                      小計：<strong className="font-mono text-slate-900">NT$ {(selectedProduct.price * quantity).toLocaleString()}</strong>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {addedToast && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>已成功加入跟團購物車！</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleModalAddToCart}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>加入購物車</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleModalInstantBuy}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                    >
                      直接填單跟團
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & specs */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                商品詳細介紹與預計時程
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {selectedProduct.description}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
                <span>預計抵台時間：<strong>{selectedProduct.releaseDateText}</strong></span>
                <span>集單截止：<strong className="text-rose-600">{selectedProduct.deadline}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
