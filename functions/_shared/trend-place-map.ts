export interface TrendItem {
  topic_ja: string;
  topic_en: string;
  description_ja: string;
  description_en: string;
  category: string;
  popularity: number;
}

type CanonicalCategory = 'all' | 'cafe' | 'restaurant' | 'transit' | 'parking' | 'park' | 'shopping' | 'school' | 'convenience' | 'other' | 'tourism';

interface PlaceTemplate {
  placeJa: string;
  placeEn: string;
  descriptionJa: string;
  descriptionEn: string;
  category: string;
  canonicalCategory: Exclude<CanonicalCategory, 'all'>;
}

interface MappingRule extends PlaceTemplate {
  triggers: string[];
}

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const includesAny = (haystack: string, needles: string[]) => needles.some((needle) => haystack.includes(normalize(needle)));

const CATEGORY_ALIASES: Record<CanonicalCategory, string[]> = {
  all: ['all', 'general', 'すべて'],
  cafe: ['カフェ', 'cafe', 'coffee', '喫茶'],
  restaurant: ['レストラン', 'restaurant', 'food', 'グルメ', '食事', '食べ歩き'],
  transit: ['駅・交通', 'station', 'transit', 'rail', 'train', '交通'],
  parking: ['駐車場', 'parking', 'パーキング'],
  park: ['公園・自然', 'park', 'nature', '自然', '公園'],
  shopping: ['ショッピング', 'shopping', 'mall', 'shop', '買い物'],
  school: ['学校', 'school'],
  convenience: ['コンビニ', 'convenience', 'drugstore', 'ドラッグストア'],
  other: ['その他', 'other'],
  tourism: ['観光', 'tourism', 'sightseeing', '散策', 'ランドマーク', 'seasonal', '季節'],
};

function canonicalizeCategory(value: string): CanonicalCategory {
  const normalized = normalize(value || 'all');
  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES) as Array<[CanonicalCategory, string[]]>) {
    if (aliases.some((alias) => normalized.includes(normalize(alias)))) return key;
  }
  return 'other';
}

const REGION_ALIASES: Record<string, string[]> = {
  yamanashi: ['山梨', '甲府', '勝沼', '笛吹', '河口湖', '昇仙峡', 'kofu', 'yamanashi', 'katsunuma', 'fuefuki', 'kawaguchiko'],
  kyoto: ['京都', '祇園', '嵐山', '河原町', '清水寺', '烏丸', 'kyoto', 'gion', 'arashiyama', 'karasuma'],
  shibuya: ['渋谷', '原宿', '表参道', '恵比寿', 'shibuya', 'harajuku', 'omotesando', 'ebisu'],
  shinjuku: ['新宿', '代々木', '新大久保', 'shinjuku', 'yoyogi', 'shin-okubo'],
  osaka: ['大阪', '梅田', '難波', '心斎橋', '天王寺', 'osaka', 'umeda', 'namba', 'shinsaibashi'],
  fukuoka: ['福岡', '博多', '天神', '中洲', 'fukuoka', 'hakata', 'tenjin'],
};

const REGION_RULES: Record<string, MappingRule[]> = {
  yamanashi: [
    { triggers: ['ぶどう', 'grape', 'orchard', 'フルーツ', 'fruit'], placeJa: '勝沼ぶどう郷', placeEn: 'Katsunuma Budokyo', descriptionJa: '秋のぶどう狩りやワイナリー巡りで定番の山梨代表エリア。', descriptionEn: 'A signature Yamanashi area for grape picking and winery visits.', category: '観光', canonicalCategory: 'tourism' },
    { triggers: ['カフェ', 'cafe', 'coffee'], placeJa: '河口湖カフェエリア', placeEn: 'Kawaguchiko Cafe Area', descriptionJa: '湖畔景色と一緒に楽しめるカフェが集まりやすい人気エリア。', descriptionEn: 'A popular cafe area around Kawaguchiko with scenic lakeside views.', category: 'カフェ', canonicalCategory: 'cafe' },
    { triggers: ['レストラン', 'restaurant', 'food', 'グルメ', 'ほうとう'], placeJa: '甲府駅北口グルメエリア', placeEn: 'Kofu Station North Gourmet Area', descriptionJa: 'ほうとうや郷土料理を探しやすく、駅周辺で食事需要が高い。', descriptionEn: 'A strong dining area near Kofu Station for local dishes like hoto.', category: 'レストラン', canonicalCategory: 'restaurant' },
    { triggers: ['ワイン', 'winery', 'wine'], placeJa: '勝沼ワイナリーエリア', placeEn: 'Katsunuma Winery Area', descriptionJa: '試飲や景観目的で回遊しやすい山梨定番のワイナリー集積地。', descriptionEn: 'A classic winery cluster in Yamanashi for tastings and scenic visits.', category: '観光', canonicalCategory: 'tourism' },
    { triggers: ['紅葉', 'autumn', 'fall foliage'], placeJa: '河口湖もみじ回廊', placeEn: 'Kawaguchiko Momiji Corridor', descriptionJa: '秋の景観需要が高く、富士山周辺でも定番の紅葉スポット。', descriptionEn: 'A classic autumn leaves destination around Kawaguchiko.', category: '観光', canonicalCategory: 'tourism' },
    { triggers: ['信玄餅', 'souvenir', '土産'], placeJa: '桔梗信玄餅 工場テーマパーク', placeEn: 'Kikyo Shingen Mochi Factory Theme Park', descriptionJa: '山梨土産の定番で、見学と買い物をまとめて楽しみやすい。', descriptionEn: 'A signature Yamanashi souvenir destination with factory tours and shopping.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['アウトレット', 'outlet', 'shopping'], placeJa: '八ヶ岳リゾートアウトレット周辺', placeEn: 'Yatsugatake Resort Outlet Area', descriptionJa: '山梨県内でショッピング目的の立ち寄り先として使いやすい。', descriptionEn: 'A convenient outlet area within Yamanashi for shopping-focused visits.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['駅', 'station', 'train', '交通'], placeJa: '甲府駅周辺', placeEn: 'Kofu Station Area', descriptionJa: '観光や移動の起点になりやすく、駅利用の需要が安定している。', descriptionEn: 'A stable transit hub and travel base around Kofu Station.', category: '駅・交通', canonicalCategory: 'transit' },
    { triggers: ['park', 'nature', '公園', '渓谷'], placeJa: '昇仙峡', placeEn: 'Shosenkyo Gorge', descriptionJa: '自然散策と景観目的で人気の高い山梨代表の景勝地。', descriptionEn: 'A major Yamanashi scenic gorge for nature walks and views.', category: '公園・自然', canonicalCategory: 'park' },
  ],
  kyoto: [
    { triggers: ['カフェ', 'cafe', 'coffee', 'matcha', '抹茶'], placeJa: '清水寺参道カフェエリア', placeEn: 'Kiyomizu Approach Cafe Area', descriptionJa: '和カフェや抹茶スイーツ店が集まりやすく、散策途中に立ち寄りやすい。', descriptionEn: 'A cafe area with matcha sweets and tea shops along the Kiyomizu approach.', category: 'カフェ', canonicalCategory: 'cafe' },
    { triggers: ['restaurant', 'food', 'レストラン', 'グルメ', 'ランチ'], placeJa: '祇園四条グルメエリア', placeEn: 'Gion-Shijo Gourmet Area', descriptionJa: '京料理から軽食まで探しやすく、食事需要が安定して高い。', descriptionEn: 'A steady dining area in Gion-Shijo for Kyoto cuisine and casual meals.', category: 'レストラン', canonicalCategory: 'restaurant' },
    { triggers: ['shopping', '買い物', 'mall', 'shop'], placeJa: '新京極商店街', placeEn: 'Shinkyogoku Shopping Street', descriptionJa: '土産物や雑貨をまとめて見やすい京都中心部の買い物エリア。', descriptionEn: 'A central Kyoto shopping street for souvenirs and general browsing.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['station', 'train', '交通', '駅'], placeJa: '京都駅ビル周辺', placeEn: 'Kyoto Station Building Area', descriptionJa: '移動・待ち合わせ・買い物をまとめやすい京都最大級の交通拠点。', descriptionEn: 'Kyoto’s major transit hub for transport, shopping, and meetups.', category: '駅・交通', canonicalCategory: 'transit' },
    { triggers: ['park', 'nature', '公園', '庭園'], placeJa: '南禅寺周辺散策エリア', placeEn: 'Nanzenji Walking Area', descriptionJa: '庭園や静かな散策需要が集まりやすい京都東山の定番エリア。', descriptionEn: 'A calm Kyoto Higashiyama walking area popular for gardens and strolls.', category: '公園・自然', canonicalCategory: 'park' },
    { triggers: ['temple', '観光', 'sightseeing', 'seasonal', '季節', '紅葉'], placeJa: '清水寺周辺エリア', placeEn: 'Kiyomizu-dera Area', descriptionJa: '京都らしい名所巡りがしやすく、定番観光の中心になりやすい。', descriptionEn: 'A classic Kyoto sightseeing area centered on landmark visits.', category: '観光', canonicalCategory: 'tourism' },
  ],
  shibuya: [
    { triggers: ['カフェ', 'cafe', 'coffee'], placeJa: '表参道カフェエリア', placeEn: 'Omotesando Cafe Area', descriptionJa: '感度の高いカフェやベーカリーが集まりやすい定番エリア。', descriptionEn: 'A classic high-style cafe area around Omotesando.', category: 'カフェ', canonicalCategory: 'cafe' },
    { triggers: ['レストラン', 'food', 'restaurant', 'bar'], placeJa: '恵比寿グルメエリア', placeEn: 'Ebisu Gourmet Area', descriptionJa: 'ディナーやカジュアル利用の選択肢が多く、食事需要が高い。', descriptionEn: 'A strong dining area in Ebisu with broad meal options.', category: 'レストラン', canonicalCategory: 'restaurant' },
    { triggers: ['shopping', '買い物', 'fashion'], placeJa: '渋谷スクランブルスクエア', placeEn: 'Shibuya Scramble Square', descriptionJa: '駅直結で買い物導線が強く、渋谷らしい商業トレンドを拾いやすい。', descriptionEn: 'A station-connected landmark representing Shibuya shopping demand.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['park', 'nature', '公園'], placeJa: '代々木公園', placeEn: 'Yoyogi Park', descriptionJa: 'イベントや外遊び需要が安定して高い渋谷近接の公園。', descriptionEn: 'A classic park near Shibuya with strong outdoor demand.', category: '公園・自然', canonicalCategory: 'park' },
    { triggers: ['station', 'train', '交通'], placeJa: '渋谷駅周辺', placeEn: 'Shibuya Station Area', descriptionJa: '再開発と回遊導線で常に人の流れが集まりやすい交通ハブ。', descriptionEn: 'A major transit hub with constant foot traffic and redevelopment momentum.', category: '駅・交通', canonicalCategory: 'transit' },
  ],
  osaka: [
    { triggers: ['カフェ', 'cafe', 'coffee'], placeJa: '中崎町カフェエリア', placeEn: 'Nakazakicho Cafe Area', descriptionJa: '個人系カフェが多く、梅田近くでカフェ需要を拾いやすい。', descriptionEn: 'A strong independent cafe area near Umeda.', category: 'カフェ', canonicalCategory: 'cafe' },
    { triggers: ['food', 'restaurant', 'グルメ', 'レストラン'], placeJa: '道頓堀グルメエリア', placeEn: 'Dotonbori Gourmet Area', descriptionJa: '食べ歩きと大阪らしい飲食需要がまとまりやすい定番エリア。', descriptionEn: 'A classic Osaka dining area built around street food and local energy.', category: 'レストラン', canonicalCategory: 'restaurant' },
    { triggers: ['shopping', '買い物', 'mall'], placeJa: 'グランフロント大阪', placeEn: 'Grand Front Osaka', descriptionJa: '買い物とカフェ利用をまとめやすい梅田の大型商業施設。', descriptionEn: 'A major Umeda destination for shopping and cafes.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['station', '交通', '駅'], placeJa: '大阪駅周辺', placeEn: 'Osaka Station Area', descriptionJa: '交通結節点として常に人が集まりやすい大阪中心部。', descriptionEn: 'A central Osaka transit hub with constant activity.', category: '駅・交通', canonicalCategory: 'transit' },
    { triggers: ['観光', 'tourism', 'sightseeing'], placeJa: '大阪城公園', placeEn: 'Osaka Castle Park', descriptionJa: '景観と散策の両方で定番性が高い大阪観光スポット。', descriptionEn: 'A classic Osaka sightseeing destination for scenery and walks.', category: '観光', canonicalCategory: 'tourism' },
  ],
  fukuoka: [
    { triggers: ['カフェ', 'cafe', 'coffee'], placeJa: '大名カフェエリア', placeEn: 'Daimyo Cafe Area', descriptionJa: '感度の高いカフェやスイーツ店が集まりやすい福岡中心部。', descriptionEn: 'A central Fukuoka cafe area with stylish dessert and coffee spots.', category: 'カフェ', canonicalCategory: 'cafe' },
    { triggers: ['food', 'restaurant', 'レストラン', 'グルメ'], placeJa: '中洲川端グルメエリア', placeEn: 'Nakasu-Kawabata Gourmet Area', descriptionJa: '博多らしい食事需要や夜の回遊がまとまりやすい。', descriptionEn: 'A strong Hakata dining area with evening foot traffic.', category: 'レストラン', canonicalCategory: 'restaurant' },
    { triggers: ['shopping', '買い物', 'mall'], placeJa: '天神地下街', placeEn: 'Tenjin Underground Mall', descriptionJa: '福岡中心部で買い物需要が集まりやすい定番商業エリア。', descriptionEn: 'A classic central Fukuoka shopping destination.', category: 'ショッピング', canonicalCategory: 'shopping' },
    { triggers: ['station', 'train', '交通'], placeJa: '博多駅周辺', placeEn: 'Hakata Station Area', descriptionJa: '新幹線や空港アクセスで移動需要が強い福岡の交通拠点。', descriptionEn: 'A major Fukuoka transit hub with strong airport and rail access.', category: '駅・交通', canonicalCategory: 'transit' },
  ],
};

const REGION_FALLBACKS: Record<string, Record<CanonicalCategory, PlaceTemplate[]>> = {
  yamanashi: {
    all: [],
    cafe: [
      { placeJa: '河口湖カフェエリア', placeEn: 'Kawaguchiko Cafe Area', descriptionJa: '湖畔景色と一緒に楽しめるカフェが集まりやすい人気エリア。', descriptionEn: 'A popular lakeside cafe area around Kawaguchiko.', category: 'カフェ', canonicalCategory: 'cafe' },
      { placeJa: '勝沼ぶどう郷カフェスポット', placeEn: 'Katsunuma Cafe Spots', descriptionJa: 'ワイナリー周辺で立ち寄りやすいカフェ需要が安定している。', descriptionEn: 'A steady cafe area around Katsunuma wineries.', category: 'カフェ', canonicalCategory: 'cafe' },
    ],
    restaurant: [
      { placeJa: '甲府駅北口グルメエリア', placeEn: 'Kofu Station North Gourmet Area', descriptionJa: '郷土料理やランチを探しやすい駅周辺の定番エリア。', descriptionEn: 'A classic dining area around Kofu Station for local cuisine.', category: 'レストラン', canonicalCategory: 'restaurant' },
      { placeJa: 'ほうとう不動 河口湖北本店周辺', placeEn: 'Hoto Fudo Kawaguchiko Area', descriptionJa: '山梨名物ほうとうの需要を拾いやすい人気店周辺。', descriptionEn: 'An area around a popular hoto restaurant near Kawaguchiko.', category: 'レストラン', canonicalCategory: 'restaurant' },
    ],
    transit: [{ placeJa: '甲府駅周辺', placeEn: 'Kofu Station Area', descriptionJa: '観光の起点になりやすい山梨中心部の交通拠点。', descriptionEn: 'A transit base in central Yamanashi.', category: '駅・交通', canonicalCategory: 'transit' }],
    parking: [{ placeJa: '河口湖駅前駐車場エリア', placeEn: 'Kawaguchiko Station Parking Area', descriptionJa: '観光地近接で駐車需要が高まりやすいエリア。', descriptionEn: 'An area with strong parking demand near Kawaguchiko Station.', category: '駐車場', canonicalCategory: 'parking' }],
    park: [{ placeJa: '昇仙峡', placeEn: 'Shosenkyo Gorge', descriptionJa: '自然散策と景観目的で人気の高い代表スポット。', descriptionEn: 'A classic natural scenic destination.', category: '公園・自然', canonicalCategory: 'park' }],
    shopping: [{ placeJa: '桔梗信玄餅 工場テーマパーク', placeEn: 'Kikyo Shingen Mochi Factory Theme Park', descriptionJa: '土産需要を拾いやすい山梨定番の買い物スポット。', descriptionEn: 'A signature shopping destination for Yamanashi souvenirs.', category: 'ショッピング', canonicalCategory: 'shopping' }],
    school: [{ placeJa: '山梨大学甲府キャンパス周辺', placeEn: 'University of Yamanashi Kofu Campus Area', descriptionJa: '学生導線が強く周辺需要が動きやすいエリア。', descriptionEn: 'A student-driven area around the Kofu campus.', category: '学校', canonicalCategory: 'school' }],
    convenience: [{ placeJa: '甲府駅前コンビニ導線', placeEn: 'Kofu Station Convenience Route', descriptionJa: '駅利用者の立ち寄り需要が強い導線。', descriptionEn: 'A convenience-heavy route around Kofu Station.', category: 'コンビニ', canonicalCategory: 'convenience' }],
    other: [{ placeJa: '勝沼ぶどう郷', placeEn: 'Katsunuma Budokyo', descriptionJa: '山梨を代表する定番エリア。', descriptionEn: 'A representative Yamanashi destination.', category: '観光', canonicalCategory: 'tourism' }],
    tourism: [{ placeJa: '河口湖もみじ回廊', placeEn: 'Kawaguchiko Momiji Corridor', descriptionJa: '季節景観と観光導線で人気の定番スポット。', descriptionEn: 'A classic scenic tourism route around Kawaguchiko.', category: '観光', canonicalCategory: 'tourism' }],
  },
  kyoto: {
    all: [],
    cafe: [
      { placeJa: '清水寺参道カフェエリア', placeEn: 'Kiyomizu Approach Cafe Area', descriptionJa: '和カフェや抹茶スイーツ店が集まりやすい散策エリア。', descriptionEn: 'A walking cafe area with matcha sweets and tea shops.', category: 'カフェ', canonicalCategory: 'cafe' },
      { placeJa: '嵐山カフェエリア', placeEn: 'Arashiyama Cafe Area', descriptionJa: '竹林散策と組み合わせやすい川沿いカフェが点在する。', descriptionEn: 'A riverside cafe area in Arashiyama.', category: 'カフェ', canonicalCategory: 'cafe' },
      { placeJa: '烏丸御池カフェスポット', placeEn: 'Karasuma-Oike Cafe Spots', descriptionJa: '京都市中心部で落ち着いたカフェ需要が高い。', descriptionEn: 'A calm central Kyoto cafe zone.', category: 'カフェ', canonicalCategory: 'cafe' },
    ],
    restaurant: [{ placeJa: '祇園四条グルメエリア', placeEn: 'Gion-Shijo Gourmet Area', descriptionJa: '京料理から軽食まで幅広く探しやすい。', descriptionEn: 'A broad Kyoto dining area around Gion-Shijo.', category: 'レストラン', canonicalCategory: 'restaurant' }],
    transit: [{ placeJa: '京都駅ビル周辺', placeEn: 'Kyoto Station Building Area', descriptionJa: '移動と待ち合わせがまとまりやすい大型交通拠点。', descriptionEn: 'A major transit and meetup area around Kyoto Station.', category: '駅・交通', canonicalCategory: 'transit' }],
    parking: [{ placeJa: '京都駅八条口駐車場エリア', placeEn: 'Kyoto Station Hachijo Parking Area', descriptionJa: '車利用の需要を拾いやすい駅前駐車場エリア。', descriptionEn: 'A parking-focused zone near Kyoto Station.', category: '駐車場', canonicalCategory: 'parking' }],
    park: [{ placeJa: '南禅寺周辺散策エリア', placeEn: 'Nanzenji Walking Area', descriptionJa: '静かな散策と庭園需要が高い。', descriptionEn: 'A calm garden-and-walk area.', category: '公園・自然', canonicalCategory: 'park' }],
    shopping: [{ placeJa: '新京極商店街', placeEn: 'Shinkyogoku Shopping Street', descriptionJa: '土産物を探しやすい京都中心部の定番商店街。', descriptionEn: 'A classic central Kyoto shopping street.', category: 'ショッピング', canonicalCategory: 'shopping' }],
    school: [{ placeJa: '京都大学吉田キャンパス周辺', placeEn: 'Kyoto University Yoshida Campus Area', descriptionJa: '学生動線が強い大学周辺エリア。', descriptionEn: 'A student-driven area around Kyoto University.', category: '学校', canonicalCategory: 'school' }],
    convenience: [{ placeJa: '四条河原町コンビニ導線', placeEn: 'Shijo-Kawaramachi Convenience Route', descriptionJa: '観光客と地元利用が交わりやすい導線。', descriptionEn: 'A convenience-heavy route in central Kyoto.', category: 'コンビニ', canonicalCategory: 'convenience' }],
    other: [{ placeJa: '清水寺周辺エリア', placeEn: 'Kiyomizu-dera Area', descriptionJa: '京都らしい街歩きがしやすい定番エリア。', descriptionEn: 'A classic Kyoto walking area.', category: '観光', canonicalCategory: 'tourism' }],
    tourism: [{ placeJa: '清水寺周辺エリア', placeEn: 'Kiyomizu-dera Area', descriptionJa: '京都観光の定番として回遊しやすい。', descriptionEn: 'A classic Kyoto sightseeing area.', category: '観光', canonicalCategory: 'tourism' }],
  },
};

function detectRegion(location: string): string | null {
  const normalized = normalize(location);
  for (const [region, aliases] of Object.entries(REGION_ALIASES)) {
    if (includesAny(normalized, aliases)) return region;
  }
  return null;
}

function inferCategoryFromTrend(trend: TrendItem): CanonicalCategory {
  const source = normalize([trend.topic_ja, trend.topic_en, trend.description_ja, trend.description_en, trend.category].join(' '));
  if (includesAny(source, CATEGORY_ALIASES.cafe)) return 'cafe';
  if (includesAny(source, CATEGORY_ALIASES.restaurant)) return 'restaurant';
  if (includesAny(source, CATEGORY_ALIASES.shopping)) return 'shopping';
  if (includesAny(source, CATEGORY_ALIASES.park)) return 'park';
  if (includesAny(source, CATEGORY_ALIASES.transit)) return 'transit';
  if (includesAny(source, CATEGORY_ALIASES.parking)) return 'parking';
  if (includesAny(source, CATEGORY_ALIASES.school)) return 'school';
  if (includesAny(source, CATEGORY_ALIASES.convenience)) return 'convenience';
  return 'tourism';
}

function matchesRequestedCategory(requested: CanonicalCategory, ruleCategory: CanonicalCategory): boolean {
  if (requested === 'all') return true;
  if (requested === 'other') return true;
  return requested === ruleCategory;
}

function findRule(region: string | null, trend: TrendItem, requestedCategory: CanonicalCategory): PlaceTemplate | null {
  if (!region) return null;
  const source = normalize([trend.topic_ja, trend.topic_en, trend.description_ja, trend.description_en, trend.category].join(' '));
  const rules = REGION_RULES[region] || [];
  return (
    rules.find((rule) => matchesRequestedCategory(requestedCategory, rule.canonicalCategory) && includesAny(source, rule.triggers)) ||
    rules.find((rule) => requestedCategory !== 'all' && rule.canonicalCategory === requestedCategory) ||
    null
  );
}

function fallbackFor(region: string | null, requestedCategory: CanonicalCategory, used: Set<string>, index: number): PlaceTemplate | null {
  if (!region) return null;
  const regionFallback = REGION_FALLBACKS[region];
  if (!regionFallback) return null;
  const pool = requestedCategory === 'all'
    ? Object.values(regionFallback).flat()
    : (regionFallback[requestedCategory] || []);
  if (!pool.length) return null;
  return pool.find((item) => !used.has(item.placeJa)) || pool[index % pool.length] || null;
}

export function concretizeTrends(location: string, requestedCategoryValue: string, trends: TrendItem[]): TrendItem[] {
  const region = detectRegion(location);
  const requestedCategory = canonicalizeCategory(requestedCategoryValue || 'all');
  const used = new Set<string>();
  const results: TrendItem[] = [];

  for (let index = 0; index < trends.length; index += 1) {
    const trend = trends[index];
    const trendCategory = inferCategoryFromTrend(trend);
    let matched = findRule(region, trend, requestedCategory);

    if (!matched && requestedCategory !== 'all' && trendCategory === requestedCategory) {
      matched = fallbackFor(region, requestedCategory, used, index);
    }

    if (!matched && requestedCategory === 'all') {
      matched = findRule(region, trend, trendCategory) || fallbackFor(region, trendCategory, used, index) || fallbackFor(region, 'tourism', used, index);
    }

    if (!matched) matched = fallbackFor(region, requestedCategory, used, index) || fallbackFor(region, 'tourism', used, index);
    if (!matched) continue;
    if (used.has(matched.placeJa)) continue;

    used.add(matched.placeJa);
    results.push({
      ...trend,
      topic_ja: matched.placeJa,
      topic_en: matched.placeEn,
      description_ja: matched.descriptionJa,
      description_en: matched.descriptionEn,
      category: matched.category,
    });
  }

  return results.slice(0, 5);
}
