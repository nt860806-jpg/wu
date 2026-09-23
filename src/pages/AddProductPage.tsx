import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  ArrowLeft, 
  Image as ImageIcon, 
  Check, 
  Calendar, 
  DollarSign, 
  Users, 
  ShieldCheck,
  Flame,
  ArrowRight,
  Trash2,
  RotateCcw,
  Globe2,
  Calculator,
  CreditCard,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { Product, Artist, ProductCategory, ActivePage, UserProfile } from '../types';
import { PageHeader } from '../components/PageHeader';

interface AddProductPageProps {
  onAddProduct: (product: Product) => Promise<boolean>;
  editingProduct?: Product | null;
  onUpdateProduct?: (product: Product) => Promise<boolean>;
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
  currentUser?: UserProfile;
  onSwitchUserRole?: () => void;
}

const DRAFT_STORAGE_KEY = 'jyp_select_add_product_draft';

export const AddProductPage: React.FC<AddProductPageProps> = ({
  onAddProduct,
  editingProduct,
  onUpdateProduct,
  onNavigate,
  onOpenShare,
  currentUser,
  onSwitchUserRole,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  // Load draft from localStorage if available
  const savedDraft = (() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [artist, setArtist] = useState<Artist>(editingProduct?.artist || savedDraft?.artist || 'TWICE');
  const [campaign, setCampaign] = useState<string>(editingProduct?.campaign || savedDraft?.campaign || '10th_Anniversary');
  const [category, setCategory] = useState<ProductCategory>(editingProduct?.category || savedDraft?.category || '演唱會/巡迴周邊');
  const [title, setTitle] = useState(editingProduct?.title || savedDraft?.title || '');
  const [price, setPrice] = useState<number>(editingProduct?.price ?? savedDraft?.price ?? 1280);
  const [krwPrice, setKrwPrice] = useState<number>(editingProduct?.krwPrice ?? savedDraft?.krwPrice ?? 55000);
  const [jpyPrice, setJpyPrice] = useState<number>(editingProduct?.jpyPrice ?? savedDraft?.jpyPrice ?? 6200);
  const [targetUnits, setTargetUnits] = useState<number>(editingProduct?.targetUnits ?? savedDraft?.targetUnits ?? 100);
  const [deadline, setDeadline] = useState(editingProduct?.deadline || savedDraft?.deadline || '2026-10-15T23:59:59');
  const [unpublishAt, setUnpublishAt] = useState(editingProduct?.unpublishAt || '');
  
  // Multiple images state
  const [galleryImages, setGalleryImages] = useState<string[]>(
    editingProduct?.gallery?.length
      ? editingProduct.gallery
      : savedDraft?.galleryImages && savedDraft.galleryImages.length > 0
      ? savedDraft.galleryImages
      : [
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop'
        ]
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const [pobDetail, setPobDetail] = useState(
    editingProduct?.pobDetail || savedDraft?.pobDetail || '贈送官方限量限定自拍小卡乙張（9款隨機發放）'
  );
  const [memberOptionsText, setMemberOptionsText] = useState(
    editingProduct?.memberOptions?.join(', ') || savedDraft?.memberOptionsText || '娜璉, 定延, Momo, Sana, 志效, Mina, 多賢, 彩瑛, 子瑜'
  );
  const [description, setDescription] = useState(
    editingProduct?.description || savedDraft?.description || 'JYP 官方原廠授權正版商品。所有訂單直接向首爾官方鎖定配額，首週保證反映韓國銷量榜單。'
  );
  const [releaseDateText, setReleaseDateText] = useState(
    editingProduct?.releaseDateText || savedDraft?.releaseDateText || '預計 10 月中旬由韓國 EMS 空運抵台'
  );
  const [isHot, setIsHot] = useState<boolean>(editingProduct?.isHot ?? savedDraft?.isHot ?? true);
  // Requirement 2: 選擇付款方式共3種
  const [paymentMethod, setPaymentMethod] = useState<string>(
    editingProduct?.paymentMethod || savedDraft?.paymentMethod || '全支付(389)11016053741860'
  );
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [draftSavedTip, setDraftSavedTip] = useState(false);

  // Quick preset images
  const presetImages = [
    { label: '手燈應援', url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop' },
    { label: '棒球外套', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop' },
    { label: '回歸專輯', url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop' },
    { label: '周邊娃娃', url: 'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=1000&auto=format&fit=crop' },
    { label: '巡演現場', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000&auto=format&fit=crop' },
    { label: '寫真畫冊', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1000&auto=format&fit=crop' }
  ];

  // Auto-save form draft to localStorage
  useEffect(() => {
    if (editingProduct) return;
    const draft = {
      artist,
      campaign,
      category,
      title,
      price,
      krwPrice,
      jpyPrice,
      targetUnits,
      deadline,
      unpublishAt,
      galleryImages,
      pobDetail,
      memberOptionsText,
      description,
      releaseDateText,
      isHot,
      paymentMethod,
    };
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [
    artist,
    campaign,
    category,
    title,
    price,
    krwPrice,
    jpyPrice,
    targetUnits,
    deadline,
    unpublishAt,
    galleryImages,
    pobDetail,
    memberOptionsText,
    description,
    releaseDateText,
    isHot,
    paymentMethod,
  ]);

  // Reset Draft
  const handleClearDraft = () => {
    if (window.confirm('確定要清空已填寫的商品草稿並重設嗎？')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setTitle('');
      setPrice(1200);
      setKrwPrice(50000);
      setJpyPrice(5500);
      setPaymentMethod('全支付(389)11016053741860');
      setGalleryImages([
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop'
      ]);
      setPobDetail('');
      setDescription('');
    }
  };

  // Convert KRW to TWD estimate
  const handleConvertFromKrw = () => {
    if (!krwPrice) return;
    // Standard KRW exchange rate + international packing buffer (~1:40)
    const estimatedTwd = Math.round(krwPrice / 40);
    setPrice(estimatedTwd);
    setDraftSavedTip(true);
    setTimeout(() => setDraftSavedTip(false), 2000);
  };

  // Convert JPY to TWD estimate
  const handleConvertFromJpy = () => {
    if (!jpyPrice) return;
    // JPY rate ~0.22 + buffer
    const estimatedTwd = Math.round(jpyPrice * 0.22);
    setPrice(estimatedTwd);
    setDraftSavedTip(true);
    setTimeout(() => setDraftSavedTip(false), 2000);
  };

  // Add an image to gallery
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setGalleryImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setGalleryImages(prev => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      return updated.length > 0 ? updated : ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop'];
    });
    if (activePreviewIndex >= galleryImages.length - 1) {
      setActivePreviewIndex(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('⚠️ 權限不足：新增官方周邊與編輯功能僅限管理員操作！');
      return;
    }
    if (!title.trim()) return;

    const memberOptions = memberOptionsText
      .split(/[,，\n]/)
      .map(s => s.trim())
      .filter(Boolean);

    const primaryImage = galleryImages[0] || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop';

    const newProduct: Product = {
      ...(editingProduct || {} as Product),
      id: editingProduct?.id || `prod-${Date.now()}`,
      title,
      artist,
      campaign: campaign.trim() || '10th_Anniversary',
      category,
      price: Number(price),
      originalPrice: Math.round(Number(price) * 1.15),
      krwPrice: krwPrice ? Number(krwPrice) : undefined,
      jpyPrice: jpyPrice ? Number(jpyPrice) : undefined,
      status: editingProduct?.status || 'active',
      deadline,
      unpublishAt: unpublishAt || null,
      archived: editingProduct?.archived || false,
      currentUnits: editingProduct?.currentUnits || 0,
      targetUnits: Number(targetUnits) || 50,
      imageUrl: primaryImage,
      gallery: galleryImages,
      pobDetail,
      memberOptions,
      description,
      releaseDateText,
      features: editingProduct?.features || ['韓國 JYP 原廠授權採購', '官方特典 POB 保證無損', '計入韓國銷量大榜', '加厚防撞箱超商配送'],
      isHot,
      isOfficialLicense: true,
      paymentMethod,
    };

    setSubmitError('');
    const saved = editingProduct && onUpdateProduct
      ? await onUpdateProduct(newProduct)
      : await onAddProduct(newProduct);
    if (!saved) {
      setSubmitError('儲存失敗，請確認管理員登入狀態後重試。');
      return;
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setSubmittedSuccess(true);
    setTimeout(() => {
      onNavigate(editingProduct ? 'admin' : 'products');
    }, 1500);
  };

  // Requirement 2: 一般會員沒有看團務後台的權限
  if (!isAdmin) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="開立周邊團務 · 權限受限"
          description="新增周邊與開立團務僅限官方主團長與管理員操作，一般會員無權限存取。"
          tag="權限管制"
          actionText="← 前往會員中心"
          onActionClick={() => onNavigate('login')}
          onOpenShareModal={onOpenShare}
        />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-6">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full border border-rose-200 inline-block">
                403 · 權限不足
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                一般會員無權限開立周邊團務
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                您目前的登入身分為一般會員【{currentUser?.name || '一般粉絲'}】。
                開立官方藝人周邊團務與設定收款方式僅限官方主團長操作。
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                前往會員中心
              </button>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="w-full sm:w-auto px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition-colors"
              >
                返回首頁瀏覽周邊
              </button>
              {onSwitchUserRole && (
                <button
                  type="button"
                  onClick={onSwitchUserRole}
                  className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                >
                  ⚡ 切換為團長管理員帳號
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title={editingProduct ? '編輯官方周邊介紹' : '開立全新官方周邊團務'}
        description="支援多幣別（韓幣 ₩ / 日幣 ¥ / 台幣 NT$）換算、指定 3 種官方付款收款管道、官方特典 (POB) 明細設定與自動保留草稿。"
        tag={editingProduct ? '管理員 · 編輯周邊' : '管理員 · 新增周邊'}
        actionText="← 返回後台面板"
        onActionClick={() => onNavigate('admin')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT FORM (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-rose-600" />
                <span>{editingProduct ? '編輯周邊基本資料' : '團務周邊基本資料填寫'}</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" /> 草稿自動儲存中
                </span>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  title="重設清空草稿"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重設</span>
                </button>
              </div>
            </div>

            {submittedSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{editingProduct ? '商品介紹已更新！' : '商品已成功發布！'} 正在返回管理頁面...</span>
              </div>
            )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">{submitError}</p>}
              {/* TWO-LEVEL HIERARCHY: Artist (Level 1) & Campaign (Level 2) */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>官方商品分類（Artist → Campaign）</span>
                  </span>
                  <span className="text-[10px] text-rose-600 bg-rose-100/70 px-2 py-0.5 rounded font-mono font-medium">
                    Strict Hierarchy
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      藝人團體 (Artist) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={artist}
                      onChange={e => setArtist(e.target.value as Artist)}
                      className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-bold text-slate-900"
                    >
                      <option value="TWICE">TWICE (트와이스)</option>
                      <option value="Stray Kids">Stray Kids (스트레이 키즈)</option>
                      <option value="ITZY">ITZY (있지)</option>
                      <option value="NMIXX">NMIXX (엔믹스)</option>
                      <option value="DAY6">DAY6 (데이식스)</option>
                      <option value="Xdinary Heroes">Xdinary Heroes</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      主題批號 (Campaign) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="例：10th_Anniversary、WorldTour_MD、FanMeeting_3rd"
                      value={campaign}
                      onChange={e => setCampaign(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-slate-300 bg-white focus:outline-rose-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 self-center">快速代入活動批號：</span>
                  {['10th_Anniversary', 'WorldTour_MD', 'FanMeeting_3rd', 'Comeback_Album_POB', 'PopUpStore_2026'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCampaign(tag)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                        campaign === tag
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  📌 提示：不同主題販售同名商品（如「隨機小卡」）時，系統會依主題批號分開統計庫存與價格。
                </p>
              </div>

              {/* Category & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    商品類別 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-medium"
                  >
                    <option value="手燈/應援物">手燈 / 應援物</option>
                    <option value="演唱會/巡迴周邊">演唱會 / 巡迴周邊</option>
                    <option value="回歸專輯與特典">回歸專輯與通路特典</option>
                    <option value="年曆與會員禮">年曆與官方會員禮</option>
                    <option value="快閃店限定">快閃店限定周邊</option>
                    <option value="服飾生活周邊">服飾生活配件周邊</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    周邊商品完整名稱 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例：TWICE 10TH ANNIVERSARY 官方紀念毛毯斗篷"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500 font-medium"
                  />
                </div>
              </div>

              {/* CURRENCY & PRICING SECTION (KRW / JPY / TWD) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-rose-500" />
                    <span>多幣別售價設定 (韓幣 KRW ₩ / 日幣 JPY ¥ / 台幣 NT$)</span>
                  </span>
                  {draftSavedTip && (
                    <span className="text-[11px] text-rose-600 font-bold">已自動依匯率更新台幣售價！</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-600 font-medium">
                        韓幣官方原價 (KRW ₩)
                      </label>
                      <button
                        type="button"
                        onClick={handleConvertFromKrw}
                        className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                        title="依韓幣匯率試算台幣"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>折算台幣</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₩</span>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        placeholder="55000"
                        value={krwPrice || ''}
                        onChange={e => setKrwPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-slate-600 font-medium">
                        日圓官方原價 (JPY ¥)
                      </label>
                      <button
                        type="button"
                        onClick={handleConvertFromJpy}
                        className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                        title="依日幣匯率試算台幣"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>折算台幣</span>
                      </button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">¥</span>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        placeholder="6200"
                        value={jpyPrice || ''}
                        onChange={e => setJpyPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      台幣跟團售價 (NT$) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600">NT$</span>
                      <input
                        type="number"
                        required
                        min={1}
                        value={price}
                        onChange={e => setPrice(Number(e.target.value))}
                        className="w-full pl-11 pr-3 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-rose-300 bg-white focus:outline-rose-500 text-rose-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      成團目標 (件)
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={targetUnits}
                      onChange={e => setTargetUnits(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTION (Requirement 2: 付款方式共3種) */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    <span>選擇付款方式 (指定收款帳戶) <span className="text-rose-500">*</span></span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">共 3 種官方收款方式</span>
                </div>

                <div className="space-y-2">
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 bg-white focus:outline-rose-500 text-slate-900 cursor-pointer"
                  >
                    <option value="全支付(389)11016053741860">全支付(389)11016053741860</option>
                    <option value="824 連線 111009346292">824 連線 111009346292</option>
                    <option value="396 街口 901131004">396 街口 901131004</option>
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {[
                      {
                        name: '全支付',
                        val: '全支付(389)11016053741860',
                        sub: '全支付 (代碼 389)',
                        color: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900'
                      },
                      {
                        name: '824 連線',
                        val: '824 連線 111009346292',
                        sub: 'LINE Bank (代碼 824)',
                        color: 'from-emerald-50 to-teal-50 border-emerald-200 text-emerald-900'
                      },
                      {
                        name: '396 街口',
                        val: '396 街口 901131004',
                        sub: '街口支付 (代碼 396)',
                        color: 'from-rose-50 to-red-50 border-rose-200 text-rose-900'
                      }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setPaymentMethod(item.val)}
                        className={`p-3 rounded-xl border text-left transition-all relative ${
                          paymentMethod === item.val
                            ? 'border-rose-500 bg-white ring-2 ring-rose-200 shadow-xs'
                            : 'border-slate-200 bg-white/80 hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{item.name}</span>
                          {paymentMethod === item.val && (
                            <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-700 font-semibold mt-1 truncate">
                          {item.val}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* POB Benefit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  官方預購特典說明 (POB) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例：每本專輯贈送 JYP SHOP 獨家自拍小卡 1 張 (9款隨機)"
                  value={pobDetail}
                  onChange={e => setPobDetail(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              {/* Member Options */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  可選成員款式 / 版本清單 (以逗號區隔)
                </label>
                <input
                  type="text"
                  placeholder="例：娜璉, 定延, Momo, Sana, 志效, Mina, 多賢, 彩瑛, 子瑜"
                  value={memberOptionsText}
                  onChange={e => setMemberOptionsText(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              {/* MULTI-IMAGE UPLOAD & GALLERY SECTION */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-rose-500" />
                    <span>商品多圖上傳與圖庫 (已加入 {galleryImages.length} 張圖片)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">支援首圖與細節圖切換</span>
                </div>

                {/* Input for adding new image */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="請輸入商品圖片網址 (URL)"
                    value={newImageUrl}
                    onChange={e => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增圖片</span>
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">快速選圖加入：</span>
                  {presetImages.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        if (!galleryImages.includes(p.url)) {
                          setGalleryImages(prev => [...prev, p.url]);
                        }
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-rose-300 text-slate-700"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>

                {/* Thumbnails grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
                  {galleryImages.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        activePreviewIndex === idx ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'
                      }`}
                      onClick={() => setActivePreviewIndex(idx)}
                    >
                      <img 
                        src={img} 
                        alt={`thumb-${idx}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                          主圖
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="刪除此圖"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description & dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    預計抵台與出貨時程
                  </label>
                  <input
                    type="text"
                    value={releaseDateText}
                    onChange={e => setReleaseDateText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    結單截止時間
                  </label>
                  <input
                    type="text"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">自動下架日期（選填）</label>
                  <input type="date" value={unpublishAt} onChange={e => setUnpublishAt(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500 font-mono" />
                  <p className="text-[10px] text-slate-400 mt-1">日期過後商品會移至後台「已下架／到期」。</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  詳細商品介紹與跟團規範
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-rose-500"
                />
              </div>

              {/* Hot toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="hot-check"
                  checked={isHot}
                  onChange={e => setIsHot(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <label htmlFor="hot-check" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  標記為熱門推薦團務（顯示於首頁精選與熱門標籤）
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  取消返回
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-rose-200 flex items-center justify-center gap-2"
                >
                  <span>確認發布周邊並開團 (NT$ {Number(price).toLocaleString()})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT LIVE PREVIEW (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                前台卡片即時預覽效果
              </span>
              <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2.5 py-0.5 rounded-full">
                多圖展示中 ({galleryImages.length} 張)
              </span>
            </div>

            {/* Rendered Mock Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between">
              <div>
                <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                  <img
                    src={galleryImages[activePreviewIndex] || galleryImages[0]}
                    alt="Preview"
                    className="w-full h-full object-cover transition-all duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-900 shadow-xs">
                      {artist}
                    </span>
                    {isHot && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs flex items-center gap-1">
                        <Flame className="w-3 h-3" /> 熱門成團
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    圖 {activePreviewIndex + 1}/{galleryImages.length}
                  </div>
                </div>

                {/* Thumbnails in preview */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-1.5 p-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                          activePreviewIndex === idx ? 'border-rose-500' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="sub" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {title || '（尚未輸入周邊名稱）'}
                  </h4>

                  {/* Multi-currency tags */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                    {krwPrice ? <span>韓幣 ₩{krwPrice.toLocaleString()}</span> : null}
                    {jpyPrice ? <span>日幣 ¥{jpyPrice.toLocaleString()}</span> : null}
                  </div>

                  <div className="p-2 rounded-lg bg-rose-50 text-[11px] text-rose-900 leading-tight border border-rose-100">
                    🎁 {pobDetail || '官方特典明細'}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {description}
                  </p>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-500">
                      <span>已集單 0/{targetUnits} 件</span>
                      <span className="font-bold text-rose-600">0%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full">
                      <div className="bg-rose-500 h-full rounded-full w-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-extrabold text-slate-900 font-mono">
                    NT$ {Number(price || 0).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  disabled
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold opacity-90 cursor-not-allowed"
                >
                  前台顯示：立即跟團
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
