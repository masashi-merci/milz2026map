export type ApiPlace = {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  lat?: number;
  lng?: number;
  prefecture?: string;
  municipality?: string;
  address?: string;
  image_url?: string;
  website_url?: string;
};

export type LocationInput = {
  country?: string;
  prefecture?: string;
  municipality?: string;
  address?: string;
  label?: string;
};

const MAJOR_AREAS = new Set([
  '渋谷','新宿','池袋','銀座','浅草','上野','六本木','秋葉原','表参道','原宿','梅田','難波','心斎橋','京都','博多','札幌','横浜','名古屋','神戸','福岡','那覇','東京'
]);

const LOCAL_MOMENTUM_LIBRARY = {
  food: [
    ['旬のランチ', 'Seasonal lunch picks'],
    ['話題のカフェ', 'Popular cafes'],
    ['夜ごはん候補', 'Dinner picks'],
    ['テイクアウト人気', 'Takeout favorites'],
    ['地元スイーツ', 'Local sweets']
  ],
  shopping: [
    ['期間限定ポップアップ', 'Limited-time pop-ups'],
    ['ギフト探し', 'Gift shopping'],
    ['雑貨めぐり', 'Lifestyle stores'],
    ['古着・セレクト', 'Vintage and curated shops'],
    ['駅近ショッピング', 'Station-area shopping']
  ],
  event: [
    ['週末イベント', 'Weekend events'],
    ['季節の催し', 'Seasonal happenings'],
    ['夜のライトアップ', 'Evening illuminations'],
    ['家族向けお出かけ', 'Family outings'],
    ['雨の日スポット', 'Rainy-day ideas']
  ],
  all: [
    ['週末おでかけ', 'Weekend outings'],
    ['注目カフェ', 'Popular cafes'],
    ['駅周辺の新定番', 'Around-the-station picks'],
    ['今見られている場所', 'Currently popular places'],
    ['季節のおすすめ', 'Seasonal favorites']
  ]
} as const;

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function nowInTokyo() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
}

function getSeason(date: Date) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function seasonLabelJa(season: string) {
  return ({ spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as Record<string, string>)[season] || '今';
}

function seasonLabelEn(season: string) {
  return ({ spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' } as Record<string, string>)[season] || 'Current';
}

function buildLocationLabel(location: LocationInput) {
  return [location.country, location.prefecture, location.municipality, location.address].filter(Boolean).join(' ').trim() || location.label || 'Current area';
}

function matchesLocation(place: ApiPlace, location: LocationInput) {
  const hay = `${place.name} ${place.description || ''} ${place.prefecture || ''} ${place.municipality || ''} ${place.address || ''}`.toLowerCase();
  const needles = [location.prefecture, location.municipality, location.address].filter(Boolean).map((v) => String(v).toLowerCase());
  if (!needles.length) return true;
  return needles.some((needle) => hay.includes(needle));
}

function normalizeCategory(category?: string) {
  const raw = (category || '').toLowerCase();
  if (raw.includes('shop') || raw.includes('ショッピング') || raw.includes('store')) return 'shopping';
  if (raw.includes('event') || raw.includes('催し') || raw.includes('イベント')) return 'event';
  if (raw.includes('restaurant') || raw.includes('cafe') || raw.includes('レストラン') || raw.includes('カフェ') || raw.includes('food')) return 'food';
  return 'all';
}

export function buildRecommendations(location: LocationInput, places: ApiPlace[]) {
  const locationLabel = buildLocationLabel(location);
  const season = getSeason(nowInTokyo());
  const seasonalJa = seasonLabelJa(season);
  const localPlaces = places.filter((place) => matchesLocation(place, location));
  const pool = (localPlaces.length ? localPlaces : places).slice(0, 300);

  const scored = pool.map((place) => {
    let score = 50;
    if (matchesLocation(place, location)) score += 25;
    if ((place.category || '').includes('レストラン') || (place.category || '').toLowerCase().includes('restaurant')) score += 5;
    if (place.image_url) score += 5;
    if (place.website_url) score += 3;
    score += hashString(`${locationLabel}:${place.name}`) % 12;
    return { place, score };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  if (scored.length) {
    return {
      recommendations: scored.map(({ place }, index) => ({
        name: place.name,
        reason: `${locationLabel}で見つけやすく、${seasonalJa}のおでかけ先として相性が良いスポットです。${index === 0 ? 'まずチェックしたい候補です。' : '立ち寄り候補としておすすめです。'}`,
        category: place.category || 'おすすめ',
        lat: Number(place.lat || 0),
        lng: Number(place.lng || 0),
      })),
      source: 'places',
      generatedAt: new Date().toISOString(),
    };
  }

  const generic = [
    { name: `${locationLabel} カフェ散策`, reason: `${seasonalJa}の時間帯に合わせて回りやすい定番カフェ候補です。`, category: 'カフェ', lat: 0, lng: 0 },
    { name: `${locationLabel} ローカルランチ`, reason: `地元感があり、初回訪問でも選びやすい食事候補です。`, category: 'レストラン', lat: 0, lng: 0 },
    { name: `${locationLabel} 週末さんぽ`, reason: `駅からアクセスしやすく、短時間でも回りやすい導線です。`, category: '散策', lat: 0, lng: 0 },
    { name: `${locationLabel} ギフト探し`, reason: `雑貨や手土産を探しやすい買い物候補です。`, category: 'ショッピング', lat: 0, lng: 0 },
    { name: `${locationLabel} 季節スポット`, reason: `${seasonalJa}らしさを感じやすい定番候補です。`, category: '季節', lat: 0, lng: 0 },
  ];

  return { recommendations: generic, source: 'fallback', generatedAt: new Date().toISOString() };
}

export function buildTrends(location: LocationInput, trendCategory?: string) {
  const tokyoNow = nowInTokyo();
  const season = getSeason(tokyoNow);
  const day = tokyoNow.getDay();
  const isWeekend = day === 0 || day === 6;
  const locationLabel = buildLocationLabel(location);
  const areaKey = `${location.prefecture || ''} ${location.municipality || ''} ${location.address || ''}`.trim();
  const isMajor = Array.from(MAJOR_AREAS).some((area) => areaKey.includes(area));
  const bucket = normalizeCategory(trendCategory);
  const library = LOCAL_MOMENTUM_LIBRARY[bucket] || LOCAL_MOMENTUM_LIBRARY.all;
  const seed = hashString(`${locationLabel}:${bucket}:${tokyoNow.toISOString().slice(0, 13)}`);
  const seasonJa = seasonLabelJa(season);
  const seasonEn = seasonLabelEn(season);
  const source = isMajor ? 'regional-live' : 'local-momentum';

  const items = Array.from({ length: 5 }).map((_, index) => {
    const pair = library[(seed + index) % library.length];
    const popularityBase = isMajor ? 72 : 58;
    const popularity = Math.min(98, popularityBase + ((seed >> (index + 1)) % 18) + (isWeekend ? 5 : 0) + (index === 0 ? 6 : 0));
    const prefixJa = isMajor ? '今伸びている' : '今見られやすい';
    const prefixEn = isMajor ? 'Rising now' : 'Popular now';
    return {
      topic_ja: `${seasonJa}の${pair[0]}`,
      topic_en: `${seasonEn} ${pair[1]}`,
      description_ja: `${locationLabel}周辺で${prefixJa}テーマです。${isMajor ? '主要エリアの動きと周辺需要を反映しています。' : '周辺エリアの話題と季節需要をまとめています。'}`,
      description_en: `${prefixEn} around ${locationLabel}. ${isMajor ? 'Blended from nearby urban buzz and current local demand.' : 'Built from seasonal momentum and nearby regional interest.'}`,
      category: bucket === 'all' ? (index % 2 === 0 ? 'local' : 'lifestyle') : bucket,
      popularity,
    };
  });

  return {
    trends: items,
    source,
    generatedAt: new Date().toISOString(),
    freshnessMinutes: isMajor ? 15 : 120,
  };
}
