import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Share2, Sparkles, MessageCircle, Globe } from 'lucide-react';
import { BRAND_CONFIG } from '../data/mockData';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageTitle?: string;
  pageDescription?: string;
  pageUrl?: string;
  imageUrl?: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  pageTitle = '追星便利店 | 官方藝人周邊集單所',
  pageDescription = '專為 TWICE 與 K-POP 旗下藝人粉絲打造的專業代購與團務平台。官方直購、榜單計入、批次海關透明追蹤與即時訂單管理。',
  pageUrl = typeof window !== 'undefined' ? window.location.href : 'https://jypselect.tw',
  imageUrl = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
}) => {
  const [platform, setPlatform] = useState<'threads' | 'facebook' | 'twitter'>('threads');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Editable preview fields for the user to test
  const [customTitle, setCustomTitle] = useState(pageTitle);
  const [customDesc, setCustomDesc] = useState(pageDescription);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jypselect.tw';
  const displayUrl = pageUrl.replace(/^https?:\/\//, '');

  const shareTextForSocial = `【追星便利店 團務公告】✨
${customTitle}
${customDesc}

🔗 立即跟團/查看詳情：${pageUrl}
#TWICE #ONCE #StrayKids #STAY #ITZY #MIDZY #NMIXX #NSWER #DAY6 #追星便利店`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(shareTextForSocial);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
  };

  const handleShareThreads = () => {
    // Threads web intent text share
    const threadsUrl = `https://threads.net/intent/post?text=${encodeURIComponent(shareTextForSocial)}`;
    window.open(threadsUrl, '_blank', 'width=600,height=600');
  };

  const handleShareTwitter = () => {
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${customTitle}\n${pageUrl}\n#TWICE #JYP周邊代購`)}`;
    window.open(twUrl, '_blank', 'width=600,height=500');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">社群分享卡片預覽與設定</h3>
              <p className="text-xs text-slate-500">符合 Open Graph & Twitter Card 規範，分享到 Threads / Facebook 時即時生效</p>
            </div>
          </div>
          <button
            type="button"
            id="close-share-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-white">
          <button
            type="button"
            onClick={() => setPlatform('threads')}
            className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              platform === 'threads'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-900" />
            Threads 預覽
          </button>
          <button
            type="button"
            onClick={() => setPlatform('facebook')}
            className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              platform === 'facebook'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Facebook 預覽
          </button>
          <button
            type="button"
            onClick={() => setPlatform('twitter')}
            className={`pb-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              platform === 'twitter'
                ? 'border-sky-500 text-sky-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            X (Twitter) 預覽
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card Mockup Showcase */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {platform.toUpperCase()} 預覽效果 (卡片展示)
              </span>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                已套用 Open Graph Meta 標籤
              </span>
            </div>

            {/* Threads Mockup */}
            {platform === 'threads' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    JS
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900">kpop_store.tw</span>
                      <span className="text-slate-400 text-xs">· 剛剛</span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      【追星便利店】本期熱門官方周邊集單開放中！TWICE 10週年外套、CANDYBONG ∞ 手燈與專輯限定特典，全程海關透明報關與氣泡防撞包裝 ✨
                    </p>

                    {/* Shared Link Card in Threads */}
                    <div className="mt-3 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="aspect-[1.91/1] w-full overflow-hidden bg-slate-100 relative">
                        <img
                          src={imageUrl}
                          alt="Open Graph Preview"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded-md font-mono">
                          kpop_convenience.tw
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">KPOP_CONVENIENCE.TW</p>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1 mt-0.5">
                          {customTitle}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                          {customDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-slate-400 text-xs">
                      <span>♡ 142</span>
                      <span>💬 28</span>
                      <span>⇄ 46</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Facebook Mockup */}
            {platform === 'facebook' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs max-w-lg mx-auto">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    追星
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900">追星便利店 藝人周邊集單所</h5>
                    <p className="text-[11px] text-slate-400">贊助 · 剛剛 · 🌐</p>
                  </div>
                </div>
                <p className="text-xs text-slate-800 mb-3 leading-relaxed">
                  📢 專為粉絲量身打造！官方正品代購、韓國榜單 100% 反映，批次出貨透明看板上線囉！
                </p>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <div className="aspect-[1.91/1] w-full overflow-hidden bg-slate-100">
                    <img
                      src={imageUrl}
                      alt="Facebook og:image preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-3 bg-slate-100/70 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">KPOP_CONVENIENCE.TW</span>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mt-0.5">{customTitle}</h4>
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{customDesc}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Twitter Mockup */}
            {platform === 'twitter' && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs max-w-lg mx-auto">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    𝕏
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900">追星便利店 台灣集單所</span>
                      <span className="text-xs text-slate-400">@Star_Convenience · 2m</span>
                    </div>
                    <p className="text-xs text-slate-800 mt-1">
                      【團務更新】最新 TWICE 與 JYP 藝人演唱會官方周邊已上架！歡迎點擊連結進入官網集單：
                    </p>
                    <div className="mt-2.5 rounded-xl border border-slate-200 overflow-hidden bg-white">
                      <div className="aspect-[1.91/1] w-full bg-slate-100 overflow-hidden">
                        <img src={imageUrl} alt="Twitter Card" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="p-2.5">
                        <span className="text-[10px] text-slate-400">jypselect.tw</span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{customTitle}</h4>
                        <p className="text-[11px] text-slate-600 line-clamp-1">{customDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Share Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? '已複製官網連結！' : '複製網址連結'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyShareText}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <MessageCircle className="w-4 h-4 text-rose-500" />}
              <span>{copiedText ? '已複製社群發文文案！' : '複製含 Hashtags 貼文'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareThreads}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>直接分享至 Threads</span>
            </button>

            <button
              type="button"
              onClick={handleShareFacebook}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>直接分享至 Facebook</span>
            </button>
          </div>

          {/* Meta Tag Code Reference */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
              <span>當前 HTML 注入的社群中繼標籤 (Open Graph):</span>
              <span className="text-emerald-600 font-medium">✓ 已配置於 index.html</span>
            </div>
            <pre className="text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 overflow-x-auto font-mono">
{`<meta property="og:title" content="${customTitle}" />
<meta property="og:description" content="${customDesc}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>貼心提醒：複製連結分享至 IG 限動或 Threads 時將自動抓取上述預覽圖</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            關閉預覽
          </button>
        </div>
      </div>
    </div>
  );
};
