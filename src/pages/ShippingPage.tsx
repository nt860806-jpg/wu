import React, { useState } from 'react';
import { 
  Truck, 
  Plane, 
  CheckCircle2, 
  Clock, 
  Package, 
  ShieldCheck, 
  AlertCircle, 
  MapPin, 
  Search,
  ExternalLink,
  Video,
  Layers
} from 'lucide-react';
import { ShippingBatch, ActivePage } from '../types';
import { PageHeader } from '../components/PageHeader';

interface ShippingPageProps {
  batches: ShippingBatch[];
  onNavigate: (page: ActivePage) => void;
  onOpenShare: () => void;
}

export const ShippingPage: React.FC<ShippingPageProps> = ({
  batches,
  onNavigate,
  onOpenShare,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || '');
  const [searchTracking, setSearchTracking] = useState('');

  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0];

  const getStatusPill = (code: string) => {
    switch (code) {
      case 'order_created':
        return { text: '1. 訂單成立', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'payment_verifying':
        return { text: '2. 匯款核對', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'procuring':
        return { text: '3. 官方採購中', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      case 'ordered':
        return { text: '4. 已下單', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'shipped_kr':
        return { text: '5. 已出貨(韓方)', color: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'warehouse':
        return { text: '6. 集運倉', color: 'bg-teal-50 text-teal-800 border-teal-200' };
      case 'flight_transit':
        return { text: '7. 國際航班在途中', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'taiwan_customs_sorting':
        return { text: '8. 抵台品檢理貨', color: 'bg-rose-50 text-rose-800 border-rose-200' };
      case 'domestic_shipping':
      case 'shipping_out':
        return { text: '9. 超商寄送 (賣貨便)', color: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold' };
      default:
        return { text: '進行中', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-12">
      {/* 每一頁都要有頁面標題與描述 */}
      <PageHeader
        title="國際物流進度與批次出貨看板"
        description="堅持全程透明化作業！公開每批 JYP 官方團務的韓國提單資訊、航空班機、台灣海關報關放行時間及新北理貨中心包裝出貨進度。隨時掌握您的珍貴周邊動態。"
        tag="官方透明團務物流"
        actionText="查詢個人訂單狀況"
        onActionClick={() => onNavigate('order-status')}
        onOpenShareModal={onOpenShare}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* TOP BATCH TABS SELECTOR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                選擇目前進行中物流批次
              </h3>
              <p className="text-xs text-slate-500">
                點擊切換查看各團務的空運航班與門市刷件狀態
              </p>
            </div>
            <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 font-medium">
              每日 11:00 & 18:00 定時更新貨態
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {batches.map(batch => {
              const isSelected = batch.id === selectedBatchId;
              const pill = getStatusPill(batch.statusCode);
              return (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs ring-1 ring-rose-400'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {batch.batchCode}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-slate-200">
                      {batch.artist}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                    {batch.title}
                  </h4>
                  <div className="mt-2 text-[11px]">
                    <span className={`inline-block px-2 py-0.5 rounded-md border ${pill.color}`}>
                      {pill.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE BATCH DETAILS CONTAINER */}
        {currentBatch && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {/* Batch Header */}
            <div className="p-6 sm:p-8 bg-slate-900 text-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center font-bold">
                    <Plane className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-rose-300 font-bold block">
                      批次代號：{currentBatch.batchCode}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {currentBatch.title}
                    </h3>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <div className="text-slate-400">最後貨態更新</div>
                  <div className="font-mono text-rose-300 font-semibold">{currentBatch.lastUpdated}</div>
                </div>
              </div>

              {/* Progress Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-slate-400 block mb-0.5">當前物流狀態：</span>
                  <strong className="text-white">{currentBatch.statusText}</strong>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-slate-400 block mb-0.5">預計抵達/送達門市：</span>
                  <strong className="text-emerald-300">{currentBatch.estimatedArrival}</strong>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-slate-400 block mb-0.5">出貨完成進度：</span>
                  <strong className="text-amber-300 font-mono">
                    已發出 {currentBatch.shippedParcels} / 總計 {currentBatch.totalParcels} 箱
                  </strong>
                </div>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="p-6 sm:p-8 space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                <span>批次物流時間軸軌跡 (即時海關放行與分撥記錄)</span>
              </h4>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {currentBatch.events.map((evt, idx) => (
                  <div key={idx} className="relative group">
                    {/* Circle Node */}
                    <div className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      evt.done
                        ? 'bg-rose-600 text-white shadow-xs ring-4 ring-rose-50'
                        : 'bg-white border-2 border-slate-300 text-slate-300'
                    }`}>
                      {evt.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-900">{evt.date}</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {evt.location}
                        </span>
                        {evt.done && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                            ✓ 已完成放行
                          </span>
                        )}
                      </div>
                      <h5 className="text-sm font-bold text-slate-900">{evt.title}</h5>
                      <p className="text-xs text-slate-600 leading-relaxed">{evt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA FOR MISSING INFO OR INQUIRY */}
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-base font-bold text-slate-900">
            找不到您的團務批次代碼嗎？
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            若您的訂單屬於更早之前的過往批次或現場專人代購，請直接至訂單查詢頁輸入手機號碼，或透過官方客服洽詢。
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('order-status')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              直接輸入手機號碼查詢
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold"
            >
              聯繫客服小幫手
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
