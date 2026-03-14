export interface TrendItem {
  topic_ja: string;
  topic_en: string;
  description_ja: string;
  description_en: string;
  category: string;
  popularity: number;
}

interface PlaceTemplate {
  placeJa: string;
  placeEn: string;
  descriptionJa: string;
  descriptionEn: string;
  category?: string;
}

interface MappingRule extends PlaceTemplate {
  triggers: string[];
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const includesAny = (haystack: string, needles: string[]) => needles.some((needle) => haystack.includes(normalize(needle)));

const REGION_ALIASES: Record<string, string[]> = {
  yamanashi: ['山梨', '甲府', '勝沼', '笛吹', 'kofu', 'yamanashi', 'katsunuma', 'fuefuki'],
  shibuya: ['渋谷', '原宿', '表参道', 'shibuya', 'harajuku', 'omotesando'],
  shinjuku: ['新宿', '代々木', '高田馬場', 'shinjuku', 'yoyogi'],
  osaka: ['大阪', '梅田', '難波', '心斎橋', 'osaka', 'umeda', 'namba', 'shinsaibashi'],
  kyoto: ['京都', '祇園', '嵐山', '河原町', 'kyoto', 'gion', 'arashiyama'],
  fukuoka: ['福岡', '博多', '天神', '中洲', 'fukuoka', 'hakata', 'tenjin'],
};

const REGION_FALLBACKS: Record<string, PlaceTemplate[]> = {
  yamanashi: [
    { placeJa: '勝沼ぶどう郷', placeEn: 'Katsunuma Budokyo', descriptionJa: '山梨の定番ワイン・ぶどう観光エリア。観光農園やワイナリー巡りの拠点として人気。', descriptionEn: 'Yamanashi\'s best-known wine and grape tourism area, popular for orchards and winery visits.', category: '観光' },
    { placeJa: '笛吹市一宮町の観光農園エリア', placeEn: 'Fuefuki Ichinomiya Orchard Area', descriptionJa: '桃やぶどうの観光農園が集まり、季節体験の目的地として安定した人気がある。', descriptionEn: 'An orchard area known for peaches and grapes, with steady seasonal interest.', category: '観光' },
    { placeJa: '桔梗信玄餅 工場テーマパーク', placeEn: 'Kikyo Shingen Mochi Factory Theme Park', descriptionJa: '山梨土産の代表格として認知が高く、工場見学や買い物目的で訪れやすい。', descriptionEn: 'A well-known Yamanashi souvenir destination with factory tours and shopping appeal.', category: 'ショッピング' },
    { placeJa: '道の駅 つる', placeEn: 'Michi-no-Eki Tsuru', descriptionJa: '地元特産品や休憩需要が集まりやすい道の駅スポット。', descriptionEn: 'A roadside station popular for local products and rest stops.', category: 'ショッピング' },
    { placeJa: '御殿場プレミアム・アウトレット', placeEn: 'Gotemba Premium Outlets', descriptionJa: '山梨からも日帰りで行きやすい大型商業スポットとして安定した人気。', descriptionEn: 'A major outlet destination often visited on day trips from Yamanashi.', category: 'ショッピング' },
  ],
  shibuya: [
    { placeJa: '宮下パーク', placeEn: 'Miyashita Park', descriptionJa: '渋谷の回遊性が高い商業・屋上公園スポット。買い物と休憩を両立しやすい。', descriptionEn: 'A highly walkable shopping and rooftop park destination in Shibuya.', category: 'ショッピング' },
    { placeJa: '渋谷スクランブルスクエア', placeEn: 'Shibuya Scramble Square', descriptionJa: '展望・買い物・飲食をまとめて楽しめる渋谷駅直結の定番スポット。', descriptionEn: 'A major Shibuya station-connected destination for shopping, dining, and views.', category: 'ショッピング' },
    { placeJa: 'キャットストリート', placeEn: 'Cat Street', descriptionJa: '渋谷と原宿をつなぐ定番散策エリア。カフェや感度の高いショップが集まる。', descriptionEn: 'A classic Shibuya-Harajuku walking street lined with cafes and stylish shops.', category: '散策' },
    { placeJa: '代々木公園', placeEn: 'Yoyogi Park', descriptionJa: 'イベントやピクニック需要が高く、渋谷周辺で安定して人が集まる公園。', descriptionEn: 'A consistently popular park near Shibuya for events and picnics.', category: '公園・自然' },
  ],
  shinjuku: [
    { placeJa: '新宿御苑', placeEn: 'Shinjuku Gyoen', descriptionJa: '季節の花や散策需要が強く、新宿エリアで定番の公園スポット。', descriptionEn: 'A classic Shinjuku green space popular for seasonal scenery and walks.', category: '公園・自然' },
    { placeJa: '新宿三丁目エリア', placeEn: 'Shinjuku Sanchome Area', descriptionJa: '買い物・カフェ・夜の回遊がまとまりやすい中心エリア。', descriptionEn: 'A central area with strong demand for shopping, cafes, and evening activity.', category: 'ショッピング' },
  ],
  osaka: [
    { placeJa: 'グランフロント大阪', placeEn: 'Grand Front Osaka', descriptionJa: '梅田の定番大型商業施設。買い物とカフェ利用の需要が高い。', descriptionEn: 'A major Umeda destination for shopping and cafe visits.', category: 'ショッピング' },
    { placeJa: '道頓堀エリア', placeEn: 'Dotonbori Area', descriptionJa: '食べ歩きと夜のにぎわいで定番の大阪観光エリア。', descriptionEn: 'A classic Osaka area for street food and lively nightlife.', category: 'グルメ' },
  ],
  kyoto: [
    { placeJa: '清水寺周辺エリア', placeEn: 'Kiyomizu-dera Area', descriptionJa: '京都らしい街歩きと名所巡りがまとまりやすい定番観光エリア。', descriptionEn: 'A classic Kyoto sightseeing area for temple visits and walking routes.', category: '観光' },
    { placeJa: '嵐山エリア', placeEn: 'Arashiyama Area', descriptionJa: '竹林・川沿い散策・食べ歩き需要が集まりやすい人気観光地。', descriptionEn: 'A popular sightseeing area known for bamboo groves, riverside walks, and snacks.', category: '観光' },
  ],
  fukuoka: [
    { placeJa: '天神地下街', placeEn: 'Tenjin Underground Mall', descriptionJa: '福岡中心部で買い物需要が安定して高い定番スポット。', descriptionEn: 'A consistently popular central Fukuoka shopping destination.', category: 'ショッピング' },
    { placeJa: 'キャナルシティ博多', placeEn: 'Canal City Hakata', descriptionJa: '買い物・食事・イベントをまとめて楽しめる大型複合施設。', descriptionEn: 'A large mixed-use destination for shopping, dining, and events.', category: 'ショッピング' },
  ],
};

const REGION_RULES: Record<string, MappingRule[]> = {
  yamanashi: [
    { triggers: ['ワイン', 'ワイナリー', 'wine', 'winery'], placeJa: '勝沼ワイナリーエリア', placeEn: 'Katsunuma Winery Area', descriptionJa: '勝沼エリアのワイナリー巡りは山梨の定番。試飲や景観目的でも人気が高い。', descriptionEn: 'Katsunuma is Yamanashi\'s classic winery area, popular for tastings and scenic visits.', category: '観光' },
    { triggers: ['ぶどう', 'grape', 'フルーツ', '果物', 'orchard'], placeJa: '勝沼ぶどう郷', placeEn: 'Katsunuma Budokyo', descriptionJa: 'ぶどう狩りやワイナリー巡りの定番エリア。秋は特に関心が集まりやすい。', descriptionEn: 'A classic grape-picking and winery area with especially strong autumn interest.', category: '観光' },
    { triggers: ['信玄餅', 'souvenir', '土産', 'おみやげ'], placeJa: '桔梗信玄餅 工場テーマパーク', placeEn: 'Kikyo Shingen Mochi Factory Theme Park', descriptionJa: '山梨土産の代表格。工場見学と買い物がセットで楽しめる。', descriptionEn: 'A signature Yamanashi souvenir spot with shopping and factory-tour appeal.', category: 'ショッピング' },
    { triggers: ['アウトレット', 'outlet'], placeJa: '御殿場プレミアム・アウトレット', placeEn: 'Gotemba Premium Outlets', descriptionJa: '山梨からの広域おでかけ先として安定して人気の大型アウトレット。', descriptionEn: 'A consistently popular large outlet destination for wider Yamanashi day trips.', category: 'ショッピング' },
    { triggers: ['道の駅', 'roadside', 'michi-no-eki'], placeJa: '道の駅 つる', placeEn: 'Michi-no-Eki Tsuru', descriptionJa: '地元特産品や休憩スポットとして使いやすく、ドライブ需要とも相性がよい。', descriptionEn: 'A convenient roadside stop for local goods and driving routes.', category: 'ショッピング' },
  ],
  shibuya: [
    { triggers: ['shopping', '買い物', 'ショッピング', 'fashion', 'ファッション'], placeJa: '渋谷スクランブルスクエア', placeEn: 'Shibuya Scramble Square', descriptionJa: '駅直結で回遊しやすく、買い物と展望を一緒に楽しめる定番スポット。', descriptionEn: 'A station-connected landmark for shopping and city views.', category: 'ショッピング' },
    { triggers: ['park', '公園', 'イベント', 'picnic', 'ピクニック'], placeJa: '代々木公園', placeEn: 'Yoyogi Park', descriptionJa: 'イベントや季節の外遊び需要が高く、渋谷周辺の定番公園。', descriptionEn: 'A classic park near Shibuya known for events and seasonal outdoor visits.', category: '公園・自然' },
    { triggers: ['cafe', 'カフェ', '散策', 'walk'], placeJa: 'キャットストリート', placeEn: 'Cat Street', descriptionJa: 'カフェと散策の相性がよく、渋谷から原宿まで歩いて楽しみやすい。', descriptionEn: 'A strong cafe-and-walk area connecting Shibuya and Harajuku.', category: '散策' },
  ],
  shinjuku: [
    { triggers: ['park', '公園', '花', 'garden'], placeJa: '新宿御苑', placeEn: 'Shinjuku Gyoen', descriptionJa: '季節の景色と散策目的で安定して人気の高い公園スポット。', descriptionEn: 'A consistently popular garden destination for seasonal scenery and walks.', category: '公園・自然' },
  ],
  osaka: [
    { triggers: ['food', 'グルメ', '食べ歩き', 'night'], placeJa: '道頓堀エリア', placeEn: 'Dotonbori Area', descriptionJa: '大阪らしい食べ歩きと夜のにぎわいが集まる定番エリア。', descriptionEn: 'A classic Osaka area known for street food and nightlife.', category: 'グルメ' },
    { triggers: ['shopping', 'ショッピング', 'mall', '買い物'], placeJa: 'グランフロント大阪', placeEn: 'Grand Front Osaka', descriptionJa: '梅田で買い物とカフェ利用がまとまりやすい大型複合施設。', descriptionEn: 'A major Umeda destination for shopping and cafe visits.', category: 'ショッピング' },
  ],
};

function detectRegion(location: string): string | null {
  const normalized = normalize(location);
  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (includesAny(normalized, aliases)) return region;
  }
  return null;
}

function matchRule(region: string | null, trend: TrendItem): PlaceTemplate | null {
  const source = normalize([trend.topic_ja, trend.topic_en, trend.description_ja, trend.description_en, trend.category].join(' '));
  if (region && REGION_RULES[region]) {
    const matched = REGION_RULES[region].find((rule) => includesAny(source, rule.triggers));
    if (matched) return matched;
  }
  return null;
}

export function concretizeTrends(location: string, trends: TrendItem[]): TrendItem[] {
  const region = detectRegion(location);
  const fallbacks = (region && REGION_FALLBACKS[region]) || [];
  const used = new Set<string>();

  return trends.map((trend, index) => {
    let matched = matchRule(region, trend);
    if ((!matched || used.has(matched.placeJa)) && fallbacks.length) {
      matched = fallbacks.find((item) => !used.has(item.placeJa)) || fallbacks[index % fallbacks.length];
    }
    if (!matched) return trend;
    used.add(matched.placeJa);
    return {
      ...trend,
      topic_ja: matched.placeJa || trend.topic_ja,
      topic_en: matched.placeEn || trend.topic_en,
      description_ja: matched.descriptionJa || trend.description_ja,
      description_en: matched.descriptionEn || trend.description_en,
      category: matched.category || trend.category,
    };
  });
}
