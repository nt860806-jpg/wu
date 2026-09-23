import { useEffect, useState } from 'react';
import { ADMIN_EMAILS, supabase } from '../lib/supabase';

export interface ArtistGroup {
  id: string;
  name: string;
  display_name: string;
  kr_name: string;
  fandom: string;
  description: string;
  is_active: boolean;
}

export const DEFAULT_ARTIST_GROUPS: ArtistGroup[] = [
  { id: 'twice', name: 'TWICE', display_name: 'TWICE', kr_name: '트와이스', fandom: 'ONCE', description: '10週年紀念周邊、CANDYBONG ∞ 應援手燈與回歸專輯特典熱烈集單中。', is_active: true },
  { id: 'stray-kids', name: 'Stray Kids', display_name: 'Stray Kids', kr_name: '스트레이 키즈', fandom: 'STAY', description: 'dominATE 世界巡演 Nachimbong Ver.2 手燈與官方 SKZOO 周邊專屬代購。', is_active: true },
  { id: 'itzy', name: 'ITZY', display_name: 'ITZY', kr_name: '있지', fandom: 'MIDZY', description: 'Born To Be 巡迴環形手燈、官方會員限定周邊與韓國限定快閃特典。', is_active: true },
  { id: 'nmixx', name: 'NMIXX', display_name: 'NMIXX', kr_name: '엔믹스', fandom: 'NSWER', description: 'MIXXTICK 水母泡泡投影手燈、Fe3O4 通路自拍小卡與限定應援品。', is_active: true },
  { id: 'day6', name: 'DAY6', display_name: 'DAY6', kr_name: '데이식스', fandom: 'My Day', description: '十週年紀念 LIGHT BAND Ver.3 手錶手燈與回歸首週榜單專屬採購。', is_active: true },
  { id: 'xdinary-heroes', name: 'Xdinary Heroes', display_name: 'Xdinary Heroes', kr_name: '엑스디너리 히어로즈', fandom: 'Villains', description: '搖滾舞台應援周邊、首發演唱會 T-Shirt 與限定特典卡全套。', is_active: true },
];

export function useArtistGroups() {
  const [groups, setGroups] = useState<ArtistGroup[]>(DEFAULT_ARTIST_GROUPS);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from('artist_groups').select('*').order('name');
      if (!mounted) return;
      if (error) {
        setLoadError(error.message);
        return;
      }
      if (data) {
        setGroups(data as ArtistGroup[]);
        setLoadError('');
      }
    };
    void load();
    const channel = supabase.channel(`artist-groups-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_groups' }, () => { void load(); })
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const activeGroups = groups.filter(group => group.is_active);
  return { groups, activeGroups, loadError };
}

export const canManageArtistGroups = (email?: string) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase()));
