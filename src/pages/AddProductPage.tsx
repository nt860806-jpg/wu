import React, { useState, useEffect, useRef } from 'react';
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
  GripVertical,
  RotateCcw,
  CreditCard,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { Product, Artist, ProductCategory, ActivePage, UserProfile } from '../types';
import { PageHeader } from '../components/PageHeader';
import { useArtistGroups } from '../hooks/useArtistGroups';
import { isProductAvailable, supabase } from '../lib/supabase';

interface AddProductPageProps {
  onAddProduct: (product: Product) => Promise<boolean>;
  editingProduct?: Product | null;
  editingProducts?: Product[];
  onUpdateProduct?: (product: Product) => Promise<boolean>;
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
  currentUser?: UserProfile;
  onSwitchUserRole?: () => void;
}

const DRAFT_STORAGE_KEY = 'jyp_select_add_product_draft';

interface AdditionalProductDraft {
  id: string;
  title: string;
  price: number;
  krwPrice: number;
  jpyPrice: number;
  canChooseMember: boolean;
  memberOptionsText: string;
}

export const AddProductPage: React.FC<AddProductPageProps> = ({
  onAddProduct,
  editingProduct,
  editingProducts,
  onUpdateProduct,
  onNavigate,
  onOpenShare,
  currentUser,
  onSwitchUserRole,
}) => {
  const { activeGroups } = useArtistGroups();
  const isAdmin = currentUser?.role === 'admin';
  const isEditingGroup = Boolean(editingProducts?.length);
  const [openCampaigns, setOpenCampaigns] = useState<string[]>([]);
  const [isLoadingOpenCampaigns, setIsLoadingOpenCampaigns] = useState(true);
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
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const imageFileInput = useRef<HTMLInputElement>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);

  const [pobDetail, setPobDetail] = useState(
    editingProduct?.pobDetail || savedDraft?.pobDetail || '贈送官方限量限定自拍小卡乙張（9款隨機發放）'
  );
  const [memberOptionsText, setMemberOptionsText] = useState(
    editingProduct?.memberOptions?.join(', ') || savedDraft?.memberOptionsText || '娜璉, 定延, Momo, Sana, 志效, Mina, 多賢, 彩瑛, 子瑜'
  );
  const [canChooseMember, setCanChooseMember] = useState<boolean>(
    editingProduct ? Boolean(editingProduct.memberOptions?.length) : savedDraft?.canChooseMember ?? true
  );
  const [additionalProducts, setAdditionalProducts] = useState<AdditionalProductDraft[]>(
    editingProduct ? [] : (savedDraft?.additionalProducts || []).map((item: Partial<AdditionalProductDraft>) => ({
      id: item.id || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: item.title || '',
      price: item.price || 0,
      krwPrice: item.krwPrice || 0,
      jpyPrice: item.jpyPrice || 0,
      canChooseMember: item.canChooseMember || false,
      memberOptionsText: item.memberOptionsText || '',
    }))
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

  useEffect(() => {
    let isActive = true;
    const loadOpenCampaigns = async () => {
      setIsLoadingOpenCampaigns(true);
      const { data, error } = await supabase
        .from('products')
        .select('data,unpublish_at,archived');
      if (!isActive) return;
      if (error || !data) {
        setOpenCampaigns([]);
        setIsLoadingOpenCampaigns(false);
        return;
      }

      const campaigns = Array.from(new Set(data
        .map(row => ({
          ...row.data,
          unpublishAt: row.unpublish_at,
          archived: row.archived,
        }))
        .filter(product => product.artist === artist && product.campaign && isProductAvailable(product))
        .map(product => String(product.campaign))));
      setOpenCampaigns(campaigns.sort((a, b) => a.localeCompare(b, 'zh-Hant')));
      setIsLoadingOpenCampaigns(false);
    };

    void loadOpenCampaigns();
    return () => { isActive = false; };
  }, [artist]);

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
      canChooseMember,
      additionalProducts,
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
    canChooseMember,
    additionalProducts,
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
      setAdditionalProducts([]);
      setCanChooseMember(true);
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

  // Upload selected images to shared Supabase Storage so every visitor/device can load them.
  const handleImageFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = event.target.files ? Array.from(event.target.files) as File[] : [];
    event.target.value = '';
    if (!files.length) return;
    setImageUploadError('');
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (files.some(file => !allowedTypes.has(file.type) || file.size > 10 * 1024 * 1024)) {
      setImageUploadError('請選擇 JPG、PNG、WebP 或 GIF 圖片，每張不可超過 10 MB。');
      return;
    }
    if (galleryImages.length + files.length > 12) {
      setImageUploadError('一個商品最多可放 12 張圖片。');
      return;
    }

    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const path = `${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;
        uploadedUrls.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl);
      }
      setGalleryImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Product image upload failed', error);
      setImageUploadError('圖片上傳失敗，請確認網路後再試一次。');
    } finally {
      setIsUploadingImages(false);
    }
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

  const handleReorderGalleryImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setGalleryImages(previous => {
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= previous.length || toIndex >= previous.length) return previous;
      const reordered = [...previous];
      const [movedImage] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, movedImage);
      return reordered;
    });
    setActivePreviewIndex(activeIndex => {
      if (activeIndex === fromIndex) return toIndex;
      if (fromIndex < activeIndex && activeIndex <= toIndex) return activeIndex - 1;
      if (toIndex <= activeIndex && activeIndex < fromIndex) return activeIndex + 1;
      return activeIndex;
    });
    setDraggedImageIndex(null);
  };

  const handleAddAdditionalProduct = () => {
    setAdditionalProducts(prev => [
      ...prev,
      { id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: '', price: 0, krwPrice: 0, jpyPrice: 0, canChooseMember: false, memberOptionsText: '' }
    ]);
  };

  const handleUpdateAdditionalProduct = (id: string, updates: Partial<AdditionalProductDraft>) => {
    setAdditionalProducts(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveAdditionalProduct = (id: string) => {
    setAdditionalProducts(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('⚠️ 權限不足：新增官方周邊與編輯功能僅限管理員操作！');
      return;
    }
    setSubmitError('');
    const productDrafts = [
      { id: 'primary', title, price, krwPrice, jpyPrice, canChooseMember, memberOptionsText },
      ...additionalProducts,
    ];
    if (!isEditingGroup && productDrafts.some(item => !item.title.trim() || item.price <= 0)) {
      setSubmitError('請填寫每個品項的商品名稱和台幣售價。');
      return;
    }
    if (!isEditingGroup && productDrafts.some(item => item.canChooseMember && !item.memberOptionsText.split(/[,，\n]/).some(member => member.trim()))) {
      setSubmitError('已勾選可選團員的商品，請填入該商品可選的團員名單。');
      return;
    }

    const primaryImage = galleryImages[0] || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop';

    const commonProductFields: Omit<Product, 'id' | 'title' | 'price' | 'originalPrice' | 'krwPrice' | 'jpyPrice' | 'targetUnits' | 'memberOptions'> = {
      ...(editingProduct || {} as Product),
      artist,
      campaign: campaign.trim() || '10th_Anniversary',
      category,
      status: editingProduct?.status || 'active',
      deadline,
      unpublishAt: unpublishAt || null,
      archived: editingProduct?.archived || false,
      currentUnits: editingProduct?.currentUnits || 0,
      imageUrl: primaryImage,
      gallery: galleryImages,
      pobDetail,
      description,
      releaseDateText,
      features: editingProduct?.features || ['韓國 JYP 原廠授權採購', '官方特典 POB 保證無損', '計入韓國銷量大榜', '加厚防撞箱超商配送'],
      isHot,
      isOfficialLicense: true,
      paymentMethod,
    };

    if (isEditingGroup && editingProducts && onUpdateProduct) {
      const groupUpdates = editingProducts.map(product => ({
        ...product,
        ...commonProductFields,
        id: product.id,
        title: product.title,
        price: product.price,
        originalPrice: product.originalPrice,
        krwPrice: product.krwPrice,
        jpyPrice: product.jpyPrice,
        currentUnits: product.currentUnits,
        targetUnits: Number(targetUnits) || 50,
        memberOptions: product.memberOptions,
        status: product.status,
        archived: product.archived,
      }));

      for (const [index, product] of groupUpdates.entries()) {
        const saved = await onUpdateProduct(product);
        if (!saved) {
          setSubmitError(`整團更新至第 ${index + 1} 項時失敗；請至後台確認已更新的商品後再重試。`);
          return;
        }
      }
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setSubmittedSuccess(true);
      setTimeout(() => onNavigate('admin'), 1500);
      return;
    }

    const now = Date.now();
    const listingGroupId = editingProduct?.listingGroupId || `group-${now}`;
    const productsToPublish: Product[] = productDrafts.map((item, index) => ({
        ...commonProductFields,
        listingGroupId,
        id: index === 0 && editingProduct ? editingProduct.id : `prod-${now}-${index + 1}`,
        title: item.title.trim(),
        price: Number(item.price),
        originalPrice: Math.round(Number(item.price) * 1.15),
        krwPrice: item.krwPrice ? Number(item.krwPrice) : undefined,
        jpyPrice: item.jpyPrice ? Number(item.jpyPrice) : undefined,
        targetUnits: Number(targetUnits) || 50,
        memberOptions: item.canChooseMember ? item.memberOptionsText.split(/[,，\n]/).map(member => member.trim()).filter(Boolean) : [],
      }));

    for (const [index, product] of productsToPublish.entries()) {
      const saved = editingProduct && index === 0 && onUpdateProduct
        ? await onUpdateProduct(product)
        : await onAddProduct(product);
      if (!saved) {
        setSubmitError(productsToPublish.length > 1
          ? `第 ${index + 1} 項儲存失敗；先前已成功發布的品項仍保留，請至後台確認後再重試。`
          : '儲存失敗，請確認管理員登入狀態後重試。');
        return;
      }
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
        title={editingProduct ? '編輯整團周邊介紹' : '開立全新官方周邊團務'}
        description={editingProduct
          ? '一次更新整團共用介紹、圖片與團務設定；各商品名稱、售價和團員選項會保留。'
          : '同一團務可一次上架多款不同售價商品，個別設定是否開放選擇團員，並共用活動介紹與圖片。'}
        tag={editingProduct ? '管理員 · 編輯整團' : '管理員 · 新增周邊'}
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
                <span>{editingProduct ? '編輯整團基本資料' : '團務周邊基本資料填寫'}</span>
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
                <span>{editingProduct ? (isEditingGroup ? `整團 ${editingProducts?.length || 0} 項商品已更新！` : additionalProducts.length ? `團務商品已更新，並新增 ${additionalProducts.length} 款同團商品！` : '商品介紹已更新！') : '團務與團內商品已成功發布！'} 正在返回管理頁面...</span>
              </div>
            )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && <p role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">{submitError}</p>}
              {/* TWO-LEVEL HIERARCHY: Artist (Level 1) & Campaign (Level 2) */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    <span>官方商品分類（藝人團體 → 主題）</span>
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
                      {editingProduct && !activeGroups.some(group => group.name === editingProduct.artist) && (
                        <option value={editingProduct.artist}>{editingProduct.artist}（已停用）</option>
                      )}
                      {activeGroups.map(group => <option key={group.id} value={group.name}>{group.display_name}{group.kr_name ? ` (${group.kr_name})` : ''}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      主題 <span className="text-rose-500">*</span>
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
                  <span className="text-[10px] text-slate-500 self-center">快速代入開放中的主題：</span>
                  {openCampaigns.map(tag => (
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
                  {!isLoadingOpenCampaigns && openCampaigns.length === 0 && (
                    <span className="text-[10px] text-slate-400 self-center">目前沒有開放中的主題</span>
                  )}
                  {isLoadingOpenCampaigns && <span className="text-[10px] text-slate-400 self-center">載入開放中的主題…</span>}
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  📌 提示：不同主題販售同名商品（如「隨機小卡」）時，系統會依主題分開統計庫存與價格。
                </p>
              </div>

              {/* Category and group target shared by this theme's products */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
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
                <label className="text-xs font-bold text-slate-700 block">本團務成團目標（件）
                  <input type="number" min={1} value={targetUnits} onChange={event => setTargetUnits(Number(event.target.value))} className="mt-1 w-full px-3 py-2 text-xs sm:text-sm font-mono rounded-xl border border-slate-300 bg-white focus:outline-rose-500" />
                </label>
              </div>

              {/* Each row is a sellable item under the same campaign. */}
              <section className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{isEditingGroup ? '本團商品' : '本主題的商品品項'}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">{isEditingGroup ? '這些商品會保留各自的名稱、售價與團員選項；上方資料會一次套用整團。' : '每列都是同一主題中的一個商品，可分別設定幣別售價與可選團員。'}</p>
                  </div>
                  {!isEditingGroup && <button type="button" onClick={handleAddAdditionalProduct} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50"><Plus className="w-3.5 h-3.5" />新增同團商品</button>}
                </div>
                {isEditingGroup ? (
                  <div className="space-y-2">
                    {editingProducts?.map((product, index) => (
                      <article key={product.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
                        <div>
                          <p className="text-xs font-semibold text-slate-800">商品 {index + 1} · {product.title}</p>
                          <p className="text-[11px] text-slate-500 mt-1">NT$ {product.price.toLocaleString()}　{product.krwPrice ? `₩ ${product.krwPrice.toLocaleString()}` : ''}　{product.jpyPrice ? `¥ ${product.jpyPrice.toLocaleString()}` : ''}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">{product.memberOptions?.length ? `可選團員：${product.memberOptions.join('、')}` : '不選團員'}</span>
                      </article>
                    ))}
                  </div>
                ) : [
                  { id: 'primary', title, price, krwPrice, jpyPrice, canChooseMember, memberOptionsText, primary: true },
                  ...additionalProducts.map(item => ({ ...item, primary: false })),
                ].map((item, index) => {
                  const updateItem = (updates: Partial<AdditionalProductDraft>) => {
                    if (item.primary) {
                      if (updates.title !== undefined) setTitle(updates.title);
                      if (updates.price !== undefined) setPrice(updates.price);
                      if (updates.krwPrice !== undefined) setKrwPrice(updates.krwPrice);
                      if (updates.jpyPrice !== undefined) setJpyPrice(updates.jpyPrice);
                      if (updates.canChooseMember !== undefined) setCanChooseMember(updates.canChooseMember);
                      if (updates.memberOptionsText !== undefined) setMemberOptionsText(updates.memberOptionsText);
                    } else {
                      handleUpdateAdditionalProduct(item.id, updates);
                    }
                  };
                  return (
                    <article key={item.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between"><h5 className="text-xs font-bold text-slate-800">商品 {index + 1}</h5>{!item.primary && <button type="button" onClick={() => handleRemoveAdditionalProduct(item.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" aria-label={`刪除商品 ${index + 1}`}><Trash2 className="w-4 h-4" /></button>}</div>
                      <label className="block text-[11px] font-semibold text-slate-600">商品名稱 <span className="text-rose-500">*</span><input required type="text" value={item.title} onChange={event => updateItem({ title: event.target.value })} placeholder="例如：專輯 A Ver.、應援毛巾" className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-rose-500" /></label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block text-[11px] font-semibold text-slate-600">台幣售價（結帳使用）<span className="text-rose-500">*</span><div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-600">NT$</span><input required type="number" min={1} value={item.price || ''} onChange={event => updateItem({ price: Number(event.target.value) })} placeholder="1,280" className="w-full pl-11 pr-3 py-2.5 text-sm font-mono rounded-xl border border-rose-300 focus:outline-rose-500" /></div></label>
                        <label className="block text-[11px] font-semibold text-slate-600">韓幣售價（選填）<div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">₩</span><input type="number" min={0} value={item.krwPrice || ''} onChange={event => updateItem({ krwPrice: Number(event.target.value) })} placeholder="選填" className="w-full pl-8 pr-3 py-2.5 text-sm font-mono rounded-xl border border-slate-300 focus:outline-rose-500" /></div></label>
                        <label className="block text-[11px] font-semibold text-slate-600">日圓售價（選填）<div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">¥</span><input type="number" min={0} value={item.jpyPrice || ''} onChange={event => updateItem({ jpyPrice: Number(event.target.value) })} placeholder="選填" className="w-full pl-8 pr-3 py-2.5 text-sm font-mono rounded-xl border border-slate-300 focus:outline-rose-500" /></div></label>
                      </div>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer"><input type="checkbox" checked={item.canChooseMember} onChange={event => updateItem({ canChooseMember: event.target.checked })} className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4" />這個商品開放選擇團員</label>
                      {item.canChooseMember && <label className="block text-[11px] font-semibold text-slate-600">此商品可選團員 <span className="text-rose-500">*</span><input required type="text" value={item.memberOptionsText} onChange={event => updateItem({ memberOptionsText: event.target.value })} placeholder="輸入團員名稱，以逗號分隔" className="mt-1 w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-rose-500" /><span className="block mt-1 text-[10px] text-slate-400">例如：娜璉、定延、Momo、Sana</span></label>}
                    </article>
                  );
                })}
              </section>

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

              {/* MULTI-IMAGE UPLOAD & GALLERY SECTION */}
              <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-rose-500" />
                    <span>商品多圖上傳與圖庫 (已加入 {galleryImages.length} 張圖片)</span>
                  </label>
                  <span className="text-[11px] text-slate-500">拖曳縮圖排序；第一張為主圖</span>
                </div>

                {/* Upload image files directly from this device */}
                <div className="flex justify-end">
                  <input
                    ref={imageFileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleImageFilesSelected}
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => imageFileInput.current?.click()}
                    disabled={isUploadingImages || galleryImages.length >= 12}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shrink-0 flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isUploadingImages ? '上傳中' : '上傳圖片'}</span>
                  </button>
                </div>
                {imageUploadError && <p role="alert" className="text-xs font-semibold text-rose-700">{imageUploadError}</p>}

                {/* Thumbnails grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-2">
                  {galleryImages.map((img, idx) => (
                    <div
                      key={idx}
                      draggable={galleryImages.length > 1}
                      onDragStart={event => {
                        setDraggedImageIndex(idx);
                        event.dataTransfer.effectAllowed = 'move';
                        event.dataTransfer.setData('text/plain', String(idx));
                      }}
                      onDragOver={event => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={event => {
                        event.preventDefault();
                        const fromIndex = draggedImageIndex ?? Number(event.dataTransfer.getData('text/plain'));
                        if (Number.isInteger(fromIndex)) handleReorderGalleryImage(fromIndex, idx);
                      }}
                      onDragEnd={() => setDraggedImageIndex(null)}
                      title="拖曳調整圖片順序"
                      className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                        activePreviewIndex === idx ? 'border-rose-500 ring-2 ring-rose-200' : 'border-slate-200'
                      } ${draggedImageIndex === idx ? 'opacity-40' : ''}`}
                      onClick={() => setActivePreviewIndex(idx)}
                    >
                      <img 
                        src={img}
                        alt={`thumb-${idx}`} 
                        draggable={false}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] px-1 py-0.2 rounded font-bold">
                          主圖
                        </span>
                      )}
                      <span className="absolute bottom-1 left-1 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity" aria-label="拖曳排序">
                        <GripVertical className="w-3 h-3" />
                      </span>
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
                  <span>{editingProduct
                    ? (additionalProducts.length ? `更新商品並新增 ${additionalProducts.length} 款同團商品` : `儲存周邊介紹 (NT$ ${Number(price).toLocaleString()})`)
                    : `建立 1 個團務（${additionalProducts.filter(item => item.title.trim() && item.price > 0).length + 1} 款可選商品）`}</span>
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
