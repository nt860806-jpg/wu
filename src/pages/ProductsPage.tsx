import React, { useState } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Sparkles, 
  X, 
  Check, 
  ShieldCheck, 
  ArrowRight,
  Tag
} from 'lucide-react';
import { Product, Artist, ProductCategory } from '../types';
import { PageHeader } from '../components/PageHeader';
import { isProductAvailable } from '../lib/supabase';
import { useArtistGroups } from '../hooks/useArtistGroups';

interface ProductsPageProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onAddToCart: (product: Product, member: string | undefined, qty: number) => void;
  onInstantBuy: (product: Product, member: string | undefined, qty: number) => void;
  onOpenShare: () => void;
}

interface ProductListing {
  key: string;
  products: Product[];
  representative: Product;
}

const getListingImages = (products: Product[]) => Array.from(new Set(
  products.flatMap(product => product.gallery?.length ? product.gallery : [product.imageUrl]).filter(Boolean)
));

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onAddToCart,
  onInstantBuy,
  onOpenShare,
}) => {
  const { activeGroups } = useArtistGroups();
  // 雙層篩選架構：第一層 Artist，第二層 Campaign (Requirement 6)
  const [selectedArtist, setSelectedArtist] = useState<Artist>('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hot' | 'deadline' | 'price-asc' | 'price-desc'>('hot');

  // Detail Modal state
  const [selectedListingItems, setSelectedListingItems] = useState<string[]>([]);
  const [listingQuantities, setListingQuantities] = useState<Record<string, number>>({});
  const [listingMembers, setListingMembers] = useState<Record<string, string>>({});
  const [listingImageIndices, setListingImageIndices] = useState<Record<string, number>>({});
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [addedToast, setAddedToast] = useState(false);

  const artists: Artist[] = ['ALL', ...activeGroups.map(group => group.name)];
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
  const productListings: ProductListing[] = Array.from(
    activeAvailableProducts.reduce((groups, product) => {
      const key = product.listingGroupId || product.id;
      const listing = groups.get(key) || { key, products: [], representative: product };
      listing.products.push(product);
      groups.set(key, listing);
      return groups;
    }, new Map<string, ProductListing>()).values()
  );

  const matchesFilters = (item: Product) => {
    if (selectedArtist !== 'ALL' && item.artist !== selectedArtist) return false;
    if (selectedCampaign !== 'ALL' && item.campaign !== selectedCampaign) return false;
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.title.toLowerCase().includes(q)
        || item.description.toLowerCase().includes(q)
        || item.artist.toLowerCase().includes(q)
        || item.campaign?.toLowerCase().includes(q) || false;
    }
    return true;
  };

  // Filter and sort at the campaign-listing level so all options stay together.
  const sorted = productListings.filter(listing => listing.products.some(matchesFilters)).sort((a, b) => {
    const first = a.representative;
    const second = b.representative;
    if (sortBy === 'hot') return (second.isHot ? 1 : 0) - (first.isHot ? 1 : 0);
    if (sortBy === 'deadline') return new Date(first.deadline).getTime() - new Date(second.deadline).getTime();
    if (sortBy === 'price-asc') return Math.min(...a.products.map(p => p.price)) - Math.min(...b.products.map(p => p.price));
    if (sortBy === 'price-desc') return Math.max(...b.products.map(p => p.price)) - Math.max(...a.products.map(p => p.price));
    return 0;
  });

  const openModalForProduct = (p: Product) => {
    onSelectProduct(p);
    const listing = productListings.find(candidate => candidate.products.some(item => item.id === p.id));
    const listingItems = listing?.products || [p];
    setSelectedListingItems([]);
    setListingQuantities(Object.fromEntries(listingItems.map(item => [item.id, 1])));
    setListingMembers(Object.fromEntries(listingItems.map(item => [item.id, item.memberOptions?.[0] || ''])));
    setModalImageIndex(listing ? listingImageIndices[listing.key] || 0 : 0);
  };

  const selectedListingProducts = selectedProduct
    ? (productListings.find(listing => listing.products.some(item => item.id === selectedProduct.id))?.products || [selectedProduct])
    : [];
  const selectedListingImages = getListingImages(selectedListingProducts);

  const toggleListingProduct = (productId: string) => {
    setSelectedListingItems(current => current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]);
  };

  const handleModalAddToCart = () => {
    if (!selectedProduct) return;
    const items = selectedListingProducts.filter(item => selectedListingItems.includes(item.id));
    if (!items.length) return;
    items.forEach(item => onAddToCart(item, listingMembers[item.id] || undefined, Math.min(listingQuantities[item.id] || 1, item.purchaseLimit || Infinity)));
    setAddedToast(true);
    setTimeout(() => {
      setAddedToast(false);
    }, 1200);
  };

  const handleModalInstantBuy = () => {
    if (!selectedProduct) return;
    const items = selectedListingProducts.filter(item => selectedListingItems.includes(item.id));
    if (!items.length) return;
    items.forEach(item => onInstantBuy(item, listingMembers[item.id] || undefined, Math.min(listingQuantities[item.id] || 1, item.purchaseLimit || Infinity)));
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
                主題 <span className="text-rose-500">*</span>
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
            <span>現正開放跟團：共 <strong className="text-slate-900 font-bold">{sorted.length}</strong> 團務，團內可選多種商品</span>
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
              {sorted.map(listing => {
                const product = listing.representative;
                const progressUnits = listing.products.reduce((sum, item) => sum + item.currentUnits, 0);
                const targetUnits = listing.products.reduce((sum, item) => sum + item.targetUnits, 0);
                const progressPct = Math.min(100, Math.round((progressUnits / Math.max(targetUnits, 1)) * 100));
                const prices = listing.products.map(item => item.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const listingImages = getListingImages(listing.products);
                const listingImageIndex = Math.min(listingImageIndices[listing.key] || 0, listingImages.length - 1);
                return (
                  <div
                    key={listing.key}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                        <img
                          src={listingImages[listingImageIndex] || product.imageUrl}
                          alt={product.listingGroupId ? product.campaign || product.title : product.title}
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

                      {listingImages.length > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto px-3 pt-3" aria-label="本主題商品圖片">
                          {listingImages.map((image, imageIndex) => (
                            <button
                              key={`${image}-${imageIndex}`}
                              type="button"
                              onClick={() => setListingImageIndices(current => ({ ...current, [listing.key]: imageIndex }))}
                              aria-label={`顯示第 ${imageIndex + 1} 張商品圖片`}
                              aria-pressed={listingImageIndex === imageIndex}
                              className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 ${listingImageIndex === imageIndex ? 'border-rose-500' : 'border-slate-200'}`}
                            >
                              <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-rose-600 transition-colors">
                          {product.listingGroupId ? product.campaign || product.title : product.title}
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
                            <span>集單進度：{progressUnits}/{targetUnits} 件</span>
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
                          {minPrice === maxPrice ? `NT$ ${minPrice.toLocaleString()}` : `NT$ ${minPrice.toLocaleString()} 起`}
                        </span>
                        {listing.products.length > 1 && <span className="text-[10px] text-slate-400">最高 NT$ {maxPrice.toLocaleString()}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openModalForProduct(product)}
                          className="col-span-2 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <span>立即跟團・選擇本團商品</span>
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
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => onSelectProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Image */}
              <div className="space-y-2">
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={selectedListingImages[Math.min(modalImageIndex, selectedListingImages.length - 1)] || selectedProduct.imageUrl}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {selectedListingImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1" aria-label="本主題所有商品圖片">
                    {selectedListingImages.map((image, imageIndex) => (
                      <button
                        key={`${image}-${imageIndex}`}
                        type="button"
                        onClick={() => setModalImageIndex(imageIndex)}
                        aria-label={`預覽第 ${imageIndex + 1} 張商品圖片`}
                        aria-pressed={modalImageIndex === imageIndex}
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${modalImageIndex === imageIndex ? 'border-rose-500' : 'border-slate-200'}`}
                      >
                        <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
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
                    {selectedProduct.listingGroupId ? selectedProduct.campaign || selectedProduct.title : selectedProduct.title}
                  </h3>

                  <div className="text-xl font-extrabold text-rose-600 font-mono">
                    {selectedListingProducts.length > 1 ? `共 ${selectedListingProducts.length} 款可選商品` : `NT$ ${selectedProduct.price.toLocaleString()}`}
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100 text-xs text-rose-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      <span>官方特典通路說明</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{selectedProduct.pobDetail}</p>
                  </div>
                </div>

                <section className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">選擇這團要跟的商品</h4>
                    <p className="text-xs text-slate-500 mt-1">可以在同一團一次勾選多個品項；每個品項可分別選團員與數量。</p>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {selectedListingProducts.map(item => {
                      const checked = selectedListingItems.includes(item.id);
                      return (
                        <article key={item.id} className={`rounded-2xl border p-3 transition-colors ${checked ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
                          <div className="flex items-start gap-2.5">
                            <input type="checkbox" checked={checked} onChange={() => toggleListingProduct(item.id)} aria-label={`選擇商品 ${item.title}`} className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                                <strong className="text-xs font-mono text-rose-600">NT$ {item.price.toLocaleString()}</strong>
                              </div>
                              {(item.krwPrice || item.jpyPrice) && <div className="mt-1 flex gap-3 text-[10px] text-slate-500 font-mono">{item.krwPrice ? <span>韓幣 ₩{item.krwPrice.toLocaleString()}</span> : null}{item.jpyPrice ? <span>日圓 ¥{item.jpyPrice.toLocaleString()}</span> : null}</div>}
                              {checked && <div className="mt-2 flex flex-wrap items-end gap-2">
                                {item.memberOptions && item.memberOptions.length > 0 && <label className="flex-1 min-w-32 text-[10px] font-semibold text-slate-600">選擇團員<select value={listingMembers[item.id] || ''} onChange={event => setListingMembers(current => ({ ...current, [item.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">{item.memberOptions.map(member => <option key={member} value={member}>{member}</option>)}</select></label>}
                                <label className="text-[10px] font-semibold text-slate-600">數量{item.purchaseLimit ? `（限購 ${item.purchaseLimit} 件）` : ''}<input type="number" min={1} max={item.purchaseLimit} value={listingQuantities[item.id] || 1} onChange={event => setListingQuantities(current => ({ ...current, [item.id]: Math.min(item.purchaseLimit || Infinity, Math.max(1, Number(event.target.value) || 1)) }))} className="mt-1 block w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono" /></label>
                                <span className="pb-1 text-[10px] text-slate-500">小計 <strong className="font-mono text-slate-900">NT$ {(item.price * (listingQuantities[item.id] || 1)).toLocaleString()}</strong></span>
                              </div>}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5">
                    <span className="text-[11px] text-slate-600">已選 {selectedListingItems.length} 款商品</span>
                    <strong className="text-xs text-slate-900">合計 NT$ {selectedListingProducts.filter(item => selectedListingItems.includes(item.id)).reduce((sum, item) => sum + item.price * (listingQuantities[item.id] || 1), 0).toLocaleString()}</strong>
                  </div>
                </section>

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
                      disabled={selectedListingItems.length === 0}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>加入購物車</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleModalInstantBuy}
                      disabled={selectedListingItems.length === 0}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
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
                <span>官方出貨時間：<strong>{selectedProduct.releaseDateText}</strong></span>
                <span>集單截止：<strong className="text-rose-600">{selectedProduct.deadline}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
