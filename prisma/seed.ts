/**
 * ダミーデータ生成スクリプト
 *
 * 実データと同規模のダミーデータを生成する。
 * 実行: npm run db:seed
 *
 * 生成規模:
 *   営業所マスタ:       10件
 *   会社マスタ:         ~400件
 *   顧客マスタ:         ~2,500件
 *   日報ディーラー:     ~40件
 *   担当営業マスタ:     ~300件 x 12ヶ月 = ~3,600件
 *   予約目標:           ~200件 x 12ヶ月 = ~2,400件
 *   売上目標:           ~200件 x 12ヶ月 = ~2,400件
 *   除外条件:           5件
 *   車両クラス:         8件
 *   車両:               100台
 *   リース契約:         25件 (~50明細)
 *   点検記録:           150件
 *   駐車場:             10箇所 (~120枠)
 *   決済端末:           20件
 *   料金プラン:         16件 (8クラス x 2期)
 *   オプション料金:     8件
 *   取引先:             25件 (法人20 + 個人5)
 *   予約:               100件
 *   予約オプション:     ~35件 (予約の35%にオプション)
 *   請求書:             ~15件 (法人向け精算済予約)
 *   請求書明細:         ~40件 (各2-4行)
 *   見積書:             15件 (DRAFT:3, SENT:4, ACCEPTED:5, EXPIRED:2, REJECTED:1)
 *   見積書明細:         ~45件 (各2-4行)
 *   入金記録:           ~200件
 *   消込明細:           ~30件
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { faker } from "@faker-js/faker/locale/ja";

// --- Prisma クライアント初期化 ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// --- 定数 ---
const FISCAL_YEAR = 2025;
const MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

const AREAS = [
  "埼玉北", "埼玉南", "埼玉西", "埼玉東",
  "東京北", "東京南", "群馬", "栃木",
];

const CHANNELS = ["ディーラー", "一般整備工場", "代理店", "直販"];

const OFFICE_NAMES = [
  "越谷", "川口", "大宮", "所沢", "熊谷",
  "川越", "春日部", "上尾", "草加", "久喜",
];

// ============================================================
// 姓名マッピング（カタカナ変換用）
// ============================================================
const FAMILY_NAME_MAP: Record<string, string> = {
  "佐藤": "サトウ", "鈴木": "スズキ", "田中": "タナカ", "高橋": "タカハシ",
  "伊藤": "イトウ", "渡辺": "ワタナベ", "山本": "ヤマモト", "中村": "ナカムラ",
  "小林": "コバヤシ", "加藤": "カトウ", "吉田": "ヨシダ", "山田": "ヤマダ",
  "松本": "マツモト", "井上": "イノウエ", "木村": "キムラ", "林": "ハヤシ",
  "斎藤": "サイトウ", "清水": "シミズ", "山口": "ヤマグチ", "松田": "マツダ",
  "藤田": "フジタ", "岡田": "オカダ", "長谷川": "ハセガワ", "村上": "ムラカミ",
  "近藤": "コンドウ", "石井": "イシイ", "坂本": "サカモト", "遠藤": "エンドウ",
  "青木": "アオキ", "藤井": "フジイ", "福田": "フクダ", "太田": "オオタ",
  "三浦": "ミウラ", "藤原": "フジワラ", "岡本": "オカモト", "中島": "ナカジマ",
  "金子": "カネコ", "石田": "イシダ", "原田": "ハラダ", "野村": "ノムラ",
};

const GIVEN_NAME_MAP: Record<string, string> = {
  "太郎": "タロウ", "一郎": "イチロウ", "健一": "ケンイチ", "雄大": "ユウダイ",
  "翔太": "ショウタ", "大輔": "ダイスケ", "直樹": "ナオキ", "隆": "タカシ",
  "裕子": "ユウコ", "真由美": "マユミ", "陽子": "ヨウコ", "明美": "アケミ",
  "和也": "カズヤ", "達也": "タツヤ", "誠": "マコト", "浩二": "コウジ",
};

const FAMILY_NAMES = Object.keys(FAMILY_NAME_MAP);
const GIVEN_NAMES = Object.keys(GIVEN_NAME_MAP);

// ============================================================
// 会社名生成用定数
// ============================================================
const INDUSTRY_NAMES = [
  "建設", "製作所", "工業", "商事", "物流", "運輸", "不動産", "食品",
  "電機", "サービス", "メンテナンス", "機械", "設備", "産業", "通信",
  "開発", "エンジニアリング", "テクノ", "システム", "総合サービス",
];
const INDUSTRY_KANA_MAP: Record<string, string> = {
  "建設": "ケンセツ", "製作所": "セイサクショ", "工業": "コウギョウ", "商事": "ショウジ",
  "物流": "ブツリュウ", "運輸": "ウンユ", "不動産": "フドウサン", "食品": "ショクヒン",
  "電機": "デンキ", "サービス": "サービス", "メンテナンス": "メンテナンス",
  "機械": "キカイ", "設備": "セツビ", "産業": "サンギョウ", "通信": "ツウシン",
  "開発": "カイハツ", "エンジニアリング": "エンジニアリング", "テクノ": "テクノ",
  "システム": "システム", "総合サービス": "ソウゴウサービス",
};

const LEGAL_ENTITY_PATTERNS: Array<(name: string, kana: string) => { full: string; kana: string }> = [
  (n, k) => ({ full: `株式会社${n}`, kana: `カブシキカイシャ ${k}` }),
  (n, k) => ({ full: `${n}株式会社`, kana: `${k} カブシキカイシャ` }),
  (n, k) => ({ full: `有限会社${n}`, kana: `ユウゲンカイシャ ${k}` }),
  (n, k) => ({ full: `合同会社${n}`, kana: `ゴウドウカイシャ ${k}` }),
  // 株式会社が多い
  (n, k) => ({ full: `株式会社${n}`, kana: `カブシキカイシャ ${k}` }),
  (n, k) => ({ full: `${n}株式会社`, kana: `${k} カブシキカイシャ` }),
];

const DEPARTMENT_NAMES = [
  "総務部", "営業部", "管理部", "車両部", "購買部",
  "経理部", "業務部", "企画部", "物流部", "第一営業部", "第二営業部",
];
const DEPARTMENT_KANA_MAP: Record<string, string> = {
  "総務部": "ソウムブ", "営業部": "エイギョウブ", "管理部": "カンリブ",
  "車両部": "シャリョウブ", "購買部": "コウバイブ", "経理部": "ケイリブ",
  "業務部": "ギョウムブ", "企画部": "キカクブ", "物流部": "ブツリュウブ",
  "第一営業部": "ダイイチエイギョウブ", "第二営業部": "ダイニエイギョウブ",
};

// ============================================================
// ディーラー店舗マッピング
// ============================================================
const DEALER_STORES: Record<string, string[]> = {
  "埼玉トヨタ": ["大宮店", "浦和店", "川口店", "所沢店", "熊谷店", "川越店", "春日部店"],
  "埼玉日産": ["大宮店", "川口店", "所沢店", "川越店", "春日部店"],
  "埼玉ホンダ": ["大宮店", "浦和店", "川口店", "所沢店", "熊谷店"],
  "埼玉スバル": ["大宮店", "川口店", "所沢店", "川越店"],
  "埼玉マツダ": ["大宮店", "川口店", "熊谷店", "川越店"],
  "埼玉ダイハツ": ["大宮店", "川口店", "所沢店", "春日部店"],
  "埼玉スズキ": ["大宮店", "浦和店", "川口店", "熊谷店"],
  "関東三菱": ["大宮店", "浦和店", "川口店", "所沢店", "川越店"],
  "関東トヨペット": ["大宮店", "浦和店", "川口店", "所沢店", "熊谷店", "川越店"],
  "北関東レクサス": ["大宮店", "浦和店", "川口店"],
  "東京トヨタ": ["池袋店", "北千住店", "赤羽店", "板橋店", "練馬店"],
  "群馬スバル": ["高崎店", "前橋店", "太田店", "伊勢崎店"],
  "栃木ホンダ": ["宇都宮店", "小山店", "足利店", "那須塩原店"],
  "埼玉いすゞ": ["大宮店", "川口店", "熊谷店"],
  "関東日野": ["大宮店", "川口店", "熊谷店", "所沢店"],
};
const DEALER_NAMES = Object.keys(DEALER_STORES);

// ============================================================
// チャネルコード
// ============================================================
const CHANNEL_CODE_MAP: Record<string, string> = {
  "01": "ディーラー",
  "02": "整備工場",
  "03": "代理店",
  "04": "直販",
  "05": "リース",
  "06": "その他",
};

// ============================================================
// 車両用定数
// ============================================================
const MAKER_MODEL_MAP: Record<string, { passenger: string[]; commercial: string[] }> = {
  "トヨタ": {
    passenger: ["プリウス", "ヤリス", "カローラ", "アクア", "ハリアー", "ノア"],
    commercial: ["ハイエース", "タウンエース", "プロボックス"],
  },
  "ホンダ": {
    passenger: ["フィット", "N-BOX", "ヴェゼル", "フリード", "ステップワゴン"],
    commercial: [],
  },
  "日産": {
    passenger: ["ノート", "セレナ", "リーフ", "エクストレイル"],
    commercial: ["NV350キャラバン", "AD"],
  },
  "マツダ": {
    passenger: ["CX-5", "CX-30", "マツダ3"],
    commercial: [],
  },
  "スバル": {
    passenger: ["インプレッサ", "フォレスター"],
    commercial: [],
  },
  "スズキ": {
    passenger: ["スイフト", "ジムニー", "ハスラー", "スペーシア"],
    commercial: [],
  },
  "ダイハツ": {
    passenger: ["タント", "ロッキー", "ムーヴ"],
    commercial: [],
  },
  "三菱": {
    passenger: ["デリカD:5"],
    commercial: ["ミニキャブ"],
  },
  "いすゞ": {
    passenger: [],
    commercial: ["エルフ"],
  },
  "日野": {
    passenger: [],
    commercial: ["デュトロ"],
  },
};

const OFFICE_PLATE_REGIONS: Record<string, string> = {
  "越谷": "越谷", "川口": "川口", "大宮": "大宮", "所沢": "所沢",
  "熊谷": "熊谷", "川越": "川越", "春日部": "春日部", "上尾": "大宮",
  "草加": "越谷", "久喜": "熊谷",
};

// ============================================================
// 料金プランマスタデータ（トヨタレンタカー/トヨタレンタリース埼玉 2025年実勢価格ベース、税込）
// ============================================================
const RATE_PLAN_DATA: Record<string, { className: string; rates: { h6: number; h12: number; h24: number; perDay: number; perHour: number }; cdw: number }> = {
  "CL-00001": { className: "軽自動車",   rates: { h6: 6160, h12: 6600, h24: 8580, perDay: 7260, perHour: 1100 }, cdw: 1100 },
  "CL-00002": { className: "コンパクト", rates: { h6: 6160, h12: 6600, h24: 8580, perDay: 7260, perHour: 1320 }, cdw: 1100 },
  "CL-00003": { className: "セダン",     rates: { h6: 7150, h12: 8250, h24: 10120, perDay: 8250, perHour: 1430 }, cdw: 1100 },
  "CL-00004": { className: "ミニバン",   rates: { h6: 14300, h12: 15400, h24: 20900, perDay: 15400, perHour: 2200 }, cdw: 1650 },
  "CL-00005": { className: "SUV",        rates: { h6: 8800, h12: 9900, h24: 12100, perDay: 9900, perHour: 1650 }, cdw: 1650 },
  "CL-00006": { className: "ワゴン",     rates: { h6: 7700, h12: 9900, h24: 13200, perDay: 9900, perHour: 1650 }, cdw: 1100 },
  "CL-00007": { className: "商用車",     rates: { h6: 8800, h12: 10450, h24: 13750, perDay: 10450, perHour: 1650 }, cdw: 1100 },
  "CL-00008": { className: "高級車",     rates: { h6: 17600, h12: 24200, h24: 30800, perDay: 22550, perHour: 3300 }, cdw: 2200 },
};

// ============================================================
// オプション料金マスタデータ（トヨタレンタカー 2025年実勢価格ベース、税込）
// ============================================================
const RATE_OPTION_DATA = [
  { optionName: "チャイルドシート", price: 1650, perDay: false },
  { optionName: "ジュニアシート",   price: 1100, perDay: false },
  { optionName: "ベビーシート",     price: 1650, perDay: false },
  { optionName: "ETCカード",       price: 550, perDay: false },
  { optionName: "スタッドレスタイヤ（乗用）", price: 2200, perDay: true },
  { optionName: "スタッドレスタイヤ（SUV/ワゴン）", price: 3300, perDay: true },
  { optionName: "ペット同乗",       price: 2200, perDay: false },
  { optionName: "4WD（乗用）",     price: 1650, perDay: true },
];

// 車体色の加重配列（白30%/黒20%/シルバー20%/他30%）
const VEHICLE_COLORS = [
  ...Array(6).fill("白"),
  ...Array(4).fill("黒"),
  ...Array(4).fill("シルバー"),
  "青", "赤", "グレー", "紺", "ブラウン", "グリーン",
];

// リース先企業名
const LESSEE_COMPANIES = [
  "株式会社山田商事", "田中建設株式会社", "鈴木運輸合同会社", "佐藤工業株式会社",
  "有限会社高橋製作所", "株式会社伊藤物流", "渡辺不動産株式会社", "合同会社山本食品",
  "株式会社中村電機", "小林サービス株式会社", "加藤機械株式会社", "吉田設備有限会社",
  "松本産業株式会社", "井上通信株式会社", "木村開発合同会社",
];

const LESSEE_INDIVIDUALS = [
  "佐藤 太郎", "鈴木 一郎", "田中 健一", "高橋 雄大", "伊藤 翔太",
  "渡辺 大輔", "山本 直樹", "中村 隆", "小林 裕子", "加藤 真由美",
];

// ============================================================
// ユーティリティ
// ============================================================
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function padCode(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 配列をシャッフル（Fisher-Yates） */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 会計年度の月からDateを生成（例: fiscalYear=2025, month=4 -> 2025-04-xx） */
function dateInMonth(fiscalYear: number, month: number): Date {
  const year = month >= 4 ? fiscalYear : fiscalYear + 1;
  const day = randomInt(1, 28);
  return new Date(year, month - 1, day);
}

/** 乗用車60%/商用車40%の比率でメーカー・車種ペアを選択 */
function pickMakerModel(): { maker: string; modelName: string; isCommercial: boolean } {
  const isCommercial = Math.random() < 0.4;
  const makers = Object.keys(MAKER_MODEL_MAP);

  if (isCommercial) {
    // 商用車を持つメーカーのみ
    const commercialMakers = makers.filter(m => MAKER_MODEL_MAP[m].commercial.length > 0);
    const maker = pick(commercialMakers);
    return { maker, modelName: pick(MAKER_MODEL_MAP[maker].commercial), isCommercial: true };
  } else {
    const passengerMakers = makers.filter(m => MAKER_MODEL_MAP[m].passenger.length > 0);
    const maker = pick(passengerMakers);
    return { maker, modelName: pick(MAKER_MODEL_MAP[maker].passenger), isCommercial: false };
  }
}

/** 年式の加重選択（新しいほど多い） */
function pickYear(): number {
  const weights = [
    { year: 2025, w: 25 }, { year: 2024, w: 25 },
    { year: 2023, w: 20 }, { year: 2022, w: 15 },
    { year: 2021, w: 10 }, { year: 2020, w: 5 },
  ];
  const total = weights.reduce((s, w) => s + w.w, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.w;
    if (r <= 0) return w.year;
  }
  return 2024;
}

/** 年式連動の走行距離（年8,000-15,000km x 経過年数） */
function pickMileage(year: number): number {
  const age = 2026 - year;
  if (age <= 0) return randomInt(100, 5000);
  return randomInt(8000, 15000) * age;
}

/** 自然な会社名を生成 */
function generateCompanyName(): { officialName: string; kana: string; shortName: string; familyName: string } {
  const familyName = pick(FAMILY_NAMES);
  const familyKana = FAMILY_NAME_MAP[familyName];
  const industry = pick(INDUSTRY_NAMES);
  const industryKana = INDUSTRY_KANA_MAP[industry];
  const coreName = `${familyName}${industry}`;
  const coreKana = `${familyKana}${industryKana}`;
  const pattern = pick(LEGAL_ENTITY_PATTERNS);
  const { full, kana } = pattern(coreName, coreKana);
  return { officialName: full, kana, shortName: coreName, familyName };
}

/** 人名を生成（漢字+カタカナ） */
function generatePersonName(): { kanji: string; kana: string } {
  const family = pick(FAMILY_NAMES);
  const given = pick(GIVEN_NAMES);
  return {
    kanji: `${family} ${given}`,
    kana: `${FAMILY_NAME_MAP[family]} ${GIVEN_NAME_MAP[given]}`,
  };
}

/** ナンバープレートを生成 */
function generatePlateNumber(officeName: string): string {
  const region = OFFICE_PLATE_REGIONS[officeName] || "大宮";
  const classNum = pick(["300", "500", "800", "100", "200"]);
  const kana = pick(["あ", "い", "う", "え", "か", "き", "く", "さ", "す", "せ", "そ", "た", "な", "は", "ま", "や", "ら", "わ"]);
  const num = padCode(randomInt(1, 9999), 4);
  return `${region} ${classNum} ${kana} ${num}`;
}

/** 車両クラスコードと利用期間からレンタカー料金を計算 */
function calcRentalAmount(classCode: string, pickupDate: Date, returnDate: Date): { baseAmount: number; cdwAmount: number; cdwPerDay: number; durationDays: number; className: string } {
  const plan = RATE_PLAN_DATA[classCode];
  if (!plan) return { baseAmount: 10000, cdwAmount: 1100, cdwPerDay: 1100, durationDays: 1, className: "不明" };

  const diffMs = returnDate.getTime() - pickupDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let baseAmount: number;
  let durationDays: number;

  if (diffHours <= 6) {
    baseAmount = plan.rates.h6;
    durationDays = 1;
  } else if (diffHours <= 12) {
    baseAmount = plan.rates.h12;
    durationDays = 1;
  } else if (diffHours <= 24) {
    baseAmount = plan.rates.h24;
    durationDays = 1;
  } else {
    durationDays = Math.ceil(diffHours / 24);
    baseAmount = plan.rates.h24 + (durationDays - 1) * plan.rates.perDay;
  }

  const cdwPerDay = plan.cdw;
  const cdwAmount = cdwPerDay * durationDays;

  return { baseAmount, cdwAmount, cdwPerDay, durationDays, className: plan.className };
}

/** メーカー・車種から車両クラスコードを判定 */
function getVehicleClassCode(maker: string, modelName: string, isCommercial: boolean): string {
  // 商用車
  if (isCommercial) {
    return "CL-00007"; // 商用車
  }

  // 軽自動車（メーカー問わず車種名で判定）
  const keiModels = ["N-BOX", "タント", "ワゴンR", "ハスラー", "スペーシア", "ムーヴ", "ジムニー"];
  if (keiModels.includes(modelName)) {
    return "CL-00001"; // 軽自動車
  }

  // コンパクトカー
  const compactModels = ["フィット", "ヤリス", "アクア", "ノート", "スイフト", "マツダ3"];
  if (compactModels.includes(modelName)) {
    return "CL-00002"; // コンパクト
  }

  // セダン
  const sedanModels = ["カローラ", "インプレッサ"];
  if (sedanModels.includes(modelName)) {
    return "CL-00003"; // セダン
  }

  // ミニバン
  const minivanModels = ["セレナ", "ノア", "フリード", "ステップワゴン", "デリカD:5"];
  if (minivanModels.includes(modelName)) {
    return "CL-00004"; // ミニバン
  }

  // SUV
  const suvModels = ["ヴェゼル", "ハリアー", "エクストレイル", "CX-5", "CX-30", "フォレスター", "ロッキー"];
  if (suvModels.includes(modelName)) {
    return "CL-00005"; // SUV
  }

  // ワゴン
  if (modelName === "レヴォーグ" || modelName === "カローラツーリング") {
    return "CL-00006"; // ワゴン
  }

  // その他の車種はランダムに振り分け（コンパクト or セダン or SUV）
  return pick(["CL-00002", "CL-00003", "CL-00005"]);
}

// --- メイン ---
async function main() {
  console.log("既存データを削除中...");
  // Phase 11: 新テーブル（FK依存順で削除）
  await prisma.invoiceLine.deleteMany();
  await prisma.quotationLine.deleteMany();
  await prisma.quotation.deleteMany();
  // 請求書（FK依存順で削除）
  await prisma.invoice.deleteMany();
  // 入金管理（FK依存順で削除 — PaymentAllocation は Reservation より先に削除）
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentTerminal.deleteMany();
  // 予約管理（FK依存順で削除）
  await prisma.reservationOption.deleteMany();
  await prisma.reservation.deleteMany();
  // 料金プラン・オプション
  await prisma.ratePlan.deleteMany();
  await prisma.rateOption.deleteMany();
  // 車両管理（FK依存順で削除）
  await prisma.vehicleInspection.deleteMany();
  await prisma.leaseContractLine.deleteMany();
  await prisma.leaseContract.deleteMany();
  // Vehicle の parkingSpotId FK を先にクリア
  await prisma.vehicle.updateMany({ data: { parkingSpotId: null } });
  await prisma.parkingSpot.deleteMany();
  await prisma.parkingLot.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.vehicleClass.deleteMany();
  // 既存テーブル
  await prisma.importHistory.deleteMany();
  await prisma.exclusionRule.deleteMany();
  await prisma.salesTarget.deleteMany();
  await prisma.reservationTarget.deleteMany();
  await prisma.salesRepAssignment.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.dailyReportDealer.deleteMany();
  await prisma.account.deleteMany();
  await prisma.company.deleteMany();
  await prisma.office.deleteMany();
  await prisma.user.deleteMany();

  // =============================================
  // 0. 営業所マスタ (10件)
  // =============================================
  console.log("営業所マスタを生成中...");
  await prisma.office.createMany({
    data: OFFICE_NAMES.map((name) => ({ officeName: name })),
  });
  console.log(`  ${OFFICE_NAMES.length}件`);
  const offices = await prisma.office.findMany();

  // =============================================
  // 1. 車両クラスマスタ (8件)
  // =============================================
  console.log("車両クラスマスタを生成中...");
  const vehicleClassData = [
    { classCode: "CL-00001", className: "軽自動車", description: "N-BOX、タント、ワゴンR等", sortOrder: 1 },
    { classCode: "CL-00002", className: "コンパクト", description: "フィット、ヤリス、ノート等", sortOrder: 2 },
    { classCode: "CL-00003", className: "セダン", description: "カローラ、インプレッサ、シビック等", sortOrder: 3 },
    { classCode: "CL-00004", className: "ミニバン", description: "セレナ、ヴォクシー、ステップワゴン等", sortOrder: 4 },
    { classCode: "CL-00005", className: "SUV", description: "ヴェゼル、RAV4、フォレスター等", sortOrder: 5 },
    { classCode: "CL-00006", className: "ワゴン", description: "レヴォーグ、カローラツーリング等", sortOrder: 6 },
    { classCode: "CL-00007", className: "商用車", description: "ハイエース、キャラバン等", sortOrder: 7 },
    { classCode: "CL-00008", className: "高級車", description: "クラウン、レクサス、スカイライン等", sortOrder: 8 },
  ];
  await prisma.vehicleClass.createMany({ data: vehicleClassData });
  const vehicleClasses = await prisma.vehicleClass.findMany();
  console.log(`  ${vehicleClasses.length}件`);

  // classCode -> id のマップを作成
  const classMap = new Map<string, string>();
  for (const vc of vehicleClasses) {
    classMap.set(vc.classCode, vc.id);
  }

  // =============================================
  // 2. 会社マスタ (~400件)
  // =============================================
  console.log("会社マスタを生成中...");
  const companies: { code: string; officialName: string; kana: string; shortName: string; channelCode: string }[] = [];

  // チャネルコード分布: ディーラー40%, 整備工場30%, 代理店20%, 直販10%
  const channelWeights = [
    ...Array(40).fill("01"),
    ...Array(30).fill("02"),
    ...Array(20).fill("03"),
    ...Array(10).fill("04"),
  ];

  for (let i = 1; i <= 400; i++) {
    const code = padCode(10000 + i, 5);
    const { officialName, kana, shortName } = generateCompanyName();
    const channelCode = pick(channelWeights);
    companies.push({ code, officialName, kana, shortName, channelCode });
  }

  await prisma.company.createMany({
    data: companies.map((c) => ({
      customerCompanyCode: c.code,
      companyNameKana: c.kana,
      officialName: c.officialName,
      shortName: c.shortName,
      channelCode: c.channelCode,
    })),
  });
  console.log(`  ${companies.length}件`);

  // =============================================
  // 2. 日報ディーラー (~40件)
  // =============================================
  console.log("日報ディーラーを生成中...");
  const dealers: { companyCode: string; companyName: string }[] = [];

  // 各ディーラーから2-3店舗を選択して40件生成
  let dealerIdx = 0;
  for (const [dealerName, stores] of Object.entries(DEALER_STORES)) {
    const storeCount = Math.min(stores.length, randomInt(2, 3));
    const selectedStores = shuffle(stores).slice(0, storeCount);
    for (const store of selectedStores) {
      if (dealers.length >= 40) break;
      dealers.push({
        companyCode: padCode(40000 + dealerIdx * 100, 5),
        companyName: `${dealerName} ${store}`,
      });
      dealerIdx++;
    }
    if (dealers.length >= 40) break;
  }

  await prisma.dailyReportDealer.createMany({ data: dealers });
  console.log(`  ${dealers.length}件`);

  // =============================================
  // 3. 顧客マスタ (~2,500件)
  // =============================================
  console.log("顧客マスタを生成中...");
  const customerBatch = [];

  for (let i = 1; i <= 2500; i++) {
    const company = companies[i % companies.length];
    const deptCode = padCode(randomInt(1, 500), 5);
    const dept = pick(DEPARTMENT_NAMES);
    const deptKana = DEPARTMENT_KANA_MAP[dept];

    // 同じ会社の顧客は同じエリアに集中
    const areaIdx = parseInt(company.code, 10) % AREAS.length;
    const area = Math.random() > 0.1 ? AREAS[areaIdx] : null;

    // エリアに整合するディーラーを選択
    const dealer = Math.random() > 0.1 ? dealers[i % dealers.length].companyName : null;

    const custName = `${company.shortName} ${dept}`;
    const custKana = `${company.kana.split(" ").slice(-1)[0]} ${deptKana}`;

    customerBatch.push({
      area,
      dealer,
      channelCode: company.channelCode,
      departmentCode: deptCode,
      companyCode: company.code,
      customerCompanyCode: company.code,
      departmentCustomerCode: `${deptCode}-${company.code}`,
      departmentCustomerNameKana: custKana,
      departmentCustomerName: custName,
      shortName: custName.substring(0, 10),
    });
  }

  await prisma.customer.createMany({ data: customerBatch, skipDuplicates: true });
  const customerCount = await prisma.customer.count();
  console.log(`  ${customerCount}件`);

  // =============================================
  // 4. 担当営業マスタ (~300件 x 12ヶ月)
  // =============================================
  console.log("担当営業マスタを生成中...");
  const salesRepBatch = [];
  const uniqueClients: { code: string; client: string; store: string; office: string; repName: string }[] = [];

  for (let i = 0; i < 300; i++) {
    const company = companies[i % companies.length];
    const dealerEntry = dealers[i % dealers.length];
    // clientName はディーラー名（店舗名除外）
    const dealerFullName = dealerEntry.companyName;
    const clientName = dealerFullName.split(" ")[0]; // "埼玉トヨタ 大宮店" -> "埼玉トヨタ"
    const storeName = dealerFullName.split(" ").slice(1).join(" ") || "本店"; // "大宮店"
    const officeName = OFFICE_NAMES[i % OFFICE_NAMES.length];
    const custCode = padCode(i + 1, 6);
    const isNew = Math.random() < 0.1;
    // 同一 customerCode に対して年間固定の担当
    const rep = generatePersonName();
    const repName = rep.kanji;

    uniqueClients.push({
      code: custCode,
      client: clientName,
      store: storeName,
      office: officeName,
      repName,
    });

    for (const month of MONTHS) {
      salesRepBatch.push({
        customerCode: custCode,
        companyCode: company.code,
        departmentCode: padCode(randomInt(1, 500), 5),
        clientName,
        storeName,
        officeName,
        isNewThisTerm: isNew,
        note: Math.random() < 0.05 ? "備考テスト" : null,
        fiscalYear: FISCAL_YEAR,
        month,
        salesRepName: repName, // 年間固定
      });
    }
  }

  await prisma.salesRepAssignment.createMany({ data: salesRepBatch, skipDuplicates: true });
  const repCount = await prisma.salesRepAssignment.count();
  console.log(`  ${repCount}件`);

  // =============================================
  // 5. 予約目標（旧: 受注目標） (~200件 x 12ヶ月)
  // =============================================
  console.log("予約目標を生成中...");
  const reservationTargetBatch = [];

  for (let i = 0; i < 200; i++) {
    const client = i < uniqueClients.length ? uniqueClients[i] : pick(uniqueClients);
    for (const month of MONTHS) {
      reservationTargetBatch.push({
        clientName: client.client,
        storeName: client.store,
        officeName: client.office,
        fiscalYear: FISCAL_YEAR,
        month,
        targetCount: randomInt(1, 15),
      });
    }
  }

  await prisma.reservationTarget.createMany({ data: reservationTargetBatch, skipDuplicates: true });
  const rtCount = await prisma.reservationTarget.count();
  console.log(`  ${rtCount}件`);

  // =============================================
  // 6. 売上目標 (~200件 x 12ヶ月)
  // =============================================
  console.log("売上目標を生成中...");
  const salesTargetBatch = [];

  for (let i = 0; i < 200; i++) {
    const client = i < uniqueClients.length ? uniqueClients[i] : pick(uniqueClients);
    for (const month of MONTHS) {
      salesTargetBatch.push({
        clientName: client.client,
        storeName: client.store,
        officeName: client.office,
        fiscalYear: FISCAL_YEAR,
        month,
        targetAmount: randomInt(5, 100) * 10000,
      });
    }
  }

  await prisma.salesTarget.createMany({ data: salesTargetBatch, skipDuplicates: true });
  const stCount = await prisma.salesTarget.count();
  console.log(`  ${stCount}件`);

  // =============================================
  // 7. 除外条件
  // =============================================
  console.log("除外条件を生成中...");
  await prisma.exclusionRule.createMany({
    data: [
      { ruleType: "CHANNEL", value: "直販", description: "直販チャネルを除外" },
      { ruleType: "CHANNEL", value: "代理店", description: "代理店チャネルを除外" },
      { ruleType: "COMPANY_CODE", value: "43103", description: "特定会社コードを除外" },
      { ruleType: "COMPANY_CODE", value: "43012", description: "特定会社コードを除外" },
      { ruleType: "COMPANY_CODE", value: "43199", description: "特定会社コードを除外" },
    ],
  });
  console.log("  5件");

  // =============================================
  // 8. スタブユーザー
  // =============================================
  console.log("スタブユーザーを生成中...");
  await prisma.user.createMany({
    data: [
      { email: "admin@example.com", name: "管理者", passwordHash: "stub", role: "ADMIN" },
      { email: "manager@example.com", name: "マネージャー", passwordHash: "stub", role: "MANAGER" },
      { email: "member@example.com", name: "メンバー", passwordHash: "stub", role: "MEMBER" },
    ],
  });
  console.log("  3件");

  // =============================================
  // 9. 取引先マスタ (25件: 法人20 + 個人5)
  // =============================================
  console.log("取引先マスタを生成中...");
  const PAYMENT_TERMS_PATTERNS = [
    { closingDay: 31, paymentMonthOffset: 1, paymentDay: null, label: "月末締め翌月末払い" },
    { closingDay: 20, paymentMonthOffset: 1, paymentDay: 10, label: "20日締め翌月10日払い" },
    { closingDay: 31, paymentMonthOffset: 2, paymentDay: null, label: "月末締め翌々月末払い" },
    { closingDay: 15, paymentMonthOffset: 1, paymentDay: null, label: "15日締め翌月末払い" },
    { closingDay: 20, paymentMonthOffset: 1, paymentDay: null, label: "20日締め翌月末払い" },
    { closingDay: 31, paymentMonthOffset: 1, paymentDay: 15, label: "月末締め翌月15日払い" },
  ];

  const accountIds: string[] = [];
  const corporateAccountIds: string[] = [];
  const accountLegacyMap = new Map<string, string>(); // legacyCompanyCode -> accountId

  // 法人20件（Company からの移行想定）
  for (let i = 0; i < 20; i++) {
    const company = companies[i];
    const terms = PAYMENT_TERMS_PATTERNS[i % PAYMENT_TERMS_PATTERNS.length];
    const account = await prisma.account.create({
      data: {
        accountCode: `AC-${padCode(i + 1, 5)}`,
        accountName: company.officialName,
        accountNameKana: company.kana,
        accountType: "CORPORATE",
        closingDay: terms.closingDay,
        paymentMonthOffset: terms.paymentMonthOffset,
        paymentDay: terms.paymentDay,
        paymentTermsLabel: terms.label,
        zipCode: `${randomInt(100, 999)}-${padCode(randomInt(0, 9999), 4)}`,
        address: `埼玉県${pick(["さいたま市", "川口市", "越谷市", "所沢市", "熊谷市"])}${pick(["大宮区", "浦和区", "南区", "北区", ""])} ${randomInt(1, 5)}-${randomInt(1, 20)}-${randomInt(1, 10)}`,
        phone: `048-${padCode(randomInt(200, 999), 3)}-${padCode(randomInt(1000, 9999), 4)}`,
        email: `info@${company.shortName.toLowerCase().replace(/\s/g, "")}.co.jp`,
        legacyCompanyCode: company.code,
      },
    });
    accountIds.push(account.id);
    corporateAccountIds.push(account.id);
    accountLegacyMap.set(company.code, account.id);
  }

  // 個人5件
  for (let i = 0; i < 5; i++) {
    const person = generatePersonName();
    const account = await prisma.account.create({
      data: {
        accountCode: `AC-${padCode(21 + i, 5)}`,
        accountName: person.kanji,
        accountNameKana: person.kana,
        accountType: "INDIVIDUAL",
        phone: `090-${padCode(randomInt(1000, 9999), 4)}-${padCode(randomInt(1000, 9999), 4)}`,
        email: `${person.kanji.split(" ")[1]}${randomInt(1, 99)}@example.com`,
      },
    });
    accountIds.push(account.id);
  }
  console.log(`  ${accountIds.length}件 (法人${corporateAccountIds.length}件 + 個人${accountIds.length - corporateAccountIds.length}件)`);

  // =============================================
  // 11. 車両マスタ (100台)
  // =============================================
  console.log("車両マスタを生成中...");

  // ステータス配列を事前に作成してシャッフル: IN_STOCK:40, LEASED:35, MAINTENANCE:15, RETIRED:10
  const vehicleStatuses: ("IN_STOCK" | "LEASED" | "MAINTENANCE" | "RETIRED")[] = shuffle([
    ...Array(40).fill("IN_STOCK" as const),
    ...Array(35).fill("LEASED" as const),
    ...Array(15).fill("MAINTENANCE" as const),
    ...Array(10).fill("RETIRED" as const),
  ]);

  const vehicleIds: string[] = [];
  const vehicleStatusMap: Map<string, string> = new Map(); // vehicleId -> status
  const vehicleOfficeMap: Map<string, string> = new Map(); // vehicleId -> officeId
  const vehicleMakerMap: Map<string, boolean> = new Map(); // vehicleId -> isCommercial

  for (let i = 0; i < 100; i++) {
    const office = offices[i % offices.length]; // 各営業所に10台ずつ均等配分
    const { maker, modelName, isCommercial } = pickMakerModel();
    const status = vehicleStatuses[i];
    const year = status === "RETIRED" ? randomInt(2018, 2022) : pickYear();
    const mileage = pickMileage(year);
    const officeName = office.officeName;

    // RETIRED 車両の一部は plateNumber null
    const plateNumber = (status === "RETIRED" && Math.random() < 0.5)
      ? null
      : generatePlateNumber(officeName);

    // 車両クラスを判定
    const classCode = getVehicleClassCode(maker, modelName, isCommercial);
    const vehicleClassId = classMap.get(classCode);

    const v = await prisma.vehicle.create({
      data: {
        vehicleCode: `VH-${padCode(i + 1, 5)}`,
        plateNumber,
        vin: `JTD${padCode(randomInt(100000, 999999), 6)}${padCode(i + 1, 4)}`,
        maker,
        modelName,
        year,
        color: pick(VEHICLE_COLORS),
        mileage,
        status,
        officeId: office.id,
        vehicleClassId,
      },
    });
    vehicleIds.push(v.id);
    vehicleStatusMap.set(v.id, status);
    vehicleOfficeMap.set(v.id, office.id);
    vehicleMakerMap.set(v.id, isCommercial);
  }
  console.log(`  ${vehicleIds.length}件`);

  // ステータス別の車両IDリスト
  const leasedVehicleIds = vehicleIds.filter(id => vehicleStatusMap.get(id) === "LEASED");
  const maintenanceVehicleIds = vehicleIds.filter(id => vehicleStatusMap.get(id) === "MAINTENANCE");
  const retiredVehicleIds = vehicleIds.filter(id => vehicleStatusMap.get(id) === "RETIRED");
  const inStockVehicleIds = vehicleIds.filter(id => vehicleStatusMap.get(id) === "IN_STOCK");

  // =============================================
  // 12. リース契約 (25契約、~50明細)
  // =============================================
  console.log("リース契約を生成中...");

  let contractNum = 0;
  let totalLines = 0;

  // --- ACTIVE 15件: LEASED車両35台を1契約あたり1-4台で振り分け ---
  let leasedIdx = 0;
  const activeContracts: { id: string; vehicleIds: string[] }[] = [];

  for (let c = 0; c < 15 && leasedIdx < leasedVehicleIds.length; c++) {
    contractNum++;
    const remaining = leasedVehicleIds.length - leasedIdx;
    const remainingContracts = 15 - c;
    // 最後の契約は残り全車両を割当、それ以外は均等配分にばらつき
    const avgPerContract = Math.ceil(remaining / remainingContracts);
    const lineCount = remainingContracts === 1
      ? remaining
      : Math.min(randomInt(1, Math.min(4, avgPerContract + 1)), remaining);

    const isCorpRate = Math.random() < 0.7;
    const startYear = pick([2024, 2024, 2024, 2025]);
    const startMonth = randomInt(0, 11);
    const durationMonths = pick([24, 36, 48, 60]);
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(startYear, startMonth + durationMonths, 0);

    const contract = await prisma.leaseContract.create({
      data: {
        contractNumber: `LC-${padCode(contractNum, 5)}`,
        lesseeType: isCorpRate ? "CORPORATE" : "INDIVIDUAL",
        lesseeCompanyCode: isCorpRate ? padCode(20000 + contractNum, 5) : null,
        lesseeName: isCorpRate ? pick(LESSEE_COMPANIES) : pick(LESSEE_INDIVIDUALS),
        startDate,
        endDate,
        status: "ACTIVE",
        note: lineCount > 2 ? "複数台契約" : null,
      },
    });

    const contractVehicles: string[] = [];
    for (let l = 0; l < lineCount && leasedIdx < leasedVehicleIds.length; l++) {
      const vId = leasedVehicleIds[leasedIdx++];
      const isComm = vehicleMakerMap.get(vId);
      const monthlyAmount = isComm ? randomInt(50, 120) * 1000 : randomInt(30, 80) * 1000;

      await prisma.leaseContractLine.create({
        data: {
          contractId: contract.id,
          vehicleId: vId,
          startDate,
          endDate,
          monthlyAmount,
        },
      });
      contractVehicles.push(vId);
      totalLines++;
    }
    activeContracts.push({ id: contract.id, vehicleIds: contractVehicles });
  }

  // --- EXPIRED 7件: RETIRED車両 + 一部IN_STOCK車両（過去契約） ---
  const expiredVehicles = [...retiredVehicleIds, ...inStockVehicleIds.slice(0, 5)];
  let expiredVIdx = 0;

  for (let c = 0; c < 7 && expiredVIdx < expiredVehicles.length; c++) {
    contractNum++;
    const lineCount = Math.min(randomInt(1, 3), expiredVehicles.length - expiredVIdx);
    const isCorpRate = Math.random() < 0.7;
    const startYear = pick([2022, 2023]);
    const startMonth = randomInt(0, 11);
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(startYear + 2, startMonth, 0);

    const contract = await prisma.leaseContract.create({
      data: {
        contractNumber: `LC-${padCode(contractNum, 5)}`,
        lesseeType: isCorpRate ? "CORPORATE" : "INDIVIDUAL",
        lesseeCompanyCode: isCorpRate ? padCode(20000 + contractNum, 5) : null,
        lesseeName: isCorpRate ? pick(LESSEE_COMPANIES) : pick(LESSEE_INDIVIDUALS),
        startDate,
        endDate,
        status: "EXPIRED",
      },
    });

    for (let l = 0; l < lineCount && expiredVIdx < expiredVehicles.length; l++) {
      const vId = expiredVehicles[expiredVIdx++];
      const isComm = vehicleMakerMap.get(vId);
      const monthlyAmount = isComm ? randomInt(50, 120) * 1000 : randomInt(30, 80) * 1000;

      await prisma.leaseContractLine.create({
        data: {
          contractId: contract.id,
          vehicleId: vId,
          startDate,
          endDate,
          monthlyAmount,
        },
      });
      totalLines++;
    }
  }

  // --- TERMINATED 3件: 途中解約 ---
  const terminatedVehicles = inStockVehicleIds.slice(5, 11);
  let termVIdx = 0;

  for (let c = 0; c < 3 && termVIdx < terminatedVehicles.length; c++) {
    contractNum++;
    const lineCount = Math.min(randomInt(1, 2), terminatedVehicles.length - termVIdx);
    const startDate = new Date(2023, randomInt(0, 11), 1);
    const originalEnd = new Date(2026, randomInt(0, 11), 0);
    // 途中解約日は開始日から1年後前後
    const terminatedEnd = new Date(startDate.getFullYear() + 1, startDate.getMonth() + randomInt(0, 6), 0);

    const contract = await prisma.leaseContract.create({
      data: {
        contractNumber: `LC-${padCode(contractNum, 5)}`,
        lesseeType: "CORPORATE",
        lesseeCompanyCode: padCode(20000 + contractNum, 5),
        lesseeName: pick(LESSEE_COMPANIES),
        startDate,
        endDate: terminatedEnd,
        status: "TERMINATED",
        note: "途中解約",
      },
    });

    for (let l = 0; l < lineCount && termVIdx < terminatedVehicles.length; l++) {
      const vId = terminatedVehicles[termVIdx++];
      await prisma.leaseContractLine.create({
        data: {
          contractId: contract.id,
          vehicleId: vId,
          startDate,
          endDate: terminatedEnd,
          monthlyAmount: randomInt(30, 80) * 1000,
        },
      });
      totalLines++;
    }
  }

  console.log(`  ${contractNum}契約 (明細${totalLines}件)`);

  // =============================================
  // 13. 点検・整備記録 (150件)
  // =============================================
  console.log("点検・整備記録を生成中...");
  const inspectionBatch = [];

  // 種別分布: REGULAR 40%, SHAKEN 25%, MAINTENANCE 20%, LEGAL 15%
  const inspectionTypeWeights: ("REGULAR" | "SHAKEN" | "MAINTENANCE" | "LEGAL")[] = [
    ...Array(8).fill("REGULAR" as const),
    ...Array(5).fill("SHAKEN" as const),
    ...Array(4).fill("MAINTENANCE" as const),
    ...Array(3).fill("LEGAL" as const),
  ];

  // MAINTENANCE車両15台: 必ず未完了の直近点検を1件以上生成
  for (const vId of maintenanceVehicleIds) {
    const scheduledDate = new Date(2026, randomInt(0, 1), randomInt(1, 28)); // 2026年1-2月
    inspectionBatch.push({
      vehicleId: vId,
      inspectionType: pick(inspectionTypeWeights),
      scheduledDate,
      completedDate: null,
      isCompleted: false,
      note: "整備中",
    });
  }

  // 残り: 全100台に対してランダムに割振り（150 - maintenanceVehicleIds.length 件）
  const remainingInspections = 150 - maintenanceVehicleIds.length;
  for (let i = 0; i < remainingInspections; i++) {
    const vId = pick(vehicleIds);
    const isCompleted = Math.random() < (100 / remainingInspections); // 完了:未完了 ~= 100:35
    const year = isCompleted ? 2025 : 2026;
    const monthRange = isCompleted ? randomInt(4, 12) : randomInt(1, 6);
    const scheduledDate = new Date(year, monthRange - 1, randomInt(1, 28));

    inspectionBatch.push({
      vehicleId: vId,
      inspectionType: pick(inspectionTypeWeights),
      scheduledDate,
      completedDate: isCompleted
        ? new Date(scheduledDate.getTime() + randomInt(0, 3) * 86400000)
        : null,
      isCompleted,
      note: isCompleted && Math.random() < 0.1 ? "車検更新済み" : null,
    });
  }

  await prisma.vehicleInspection.createMany({ data: inspectionBatch });
  console.log(`  ${inspectionBatch.length}件`);

  // =============================================
  // 14. 駐車場 (10箇所) + 駐車枠 (~120枠)
  // =============================================
  console.log("駐車場・駐車枠を生成中...");
  const allSpotsByOffice: Map<string, string[]> = new Map(); // officeId -> spotId[]

  for (let o = 0; o < offices.length; o++) {
    const office = offices[o];
    const spotCount = randomInt(10, 15);

    const lot = await prisma.parkingLot.create({
      data: {
        officeId: office.id,
        name: `${office.officeName}駐車場`,
        canvasWidth: 800,
        canvasHeight: 600,
      },
    });

    const spotIds: string[] = [];
    for (let j = 0; j < spotCount; j++) {
      const row = String.fromCharCode(65 + Math.floor(j / 3)); // A, B, C, D, E
      const col = (j % 3) + 1;
      const spot = await prisma.parkingSpot.create({
        data: {
          parkingLotId: lot.id,
          spotNumber: `${row}-${col}`,
          x: 50 + (j % 3) * 220,
          y: 50 + Math.floor(j / 3) * 200,
          width: 180,
          height: 80,
          rotation: 0,
        },
      });
      spotIds.push(spot.id);
    }
    allSpotsByOffice.set(office.id, spotIds);
  }

  const totalSpots = Array.from(allSpotsByOffice.values()).reduce((s, ids) => s + ids.length, 0);
  console.log(`  ${offices.length}箇所, ${totalSpots}枠`);

  // =============================================
  // 15. 車両を駐車枠に割当 (IN_STOCK + MAINTENANCE の一部)
  // =============================================
  console.log("車両を駐車枠に割当中...");
  let assignCount = 0;

  // IN_STOCK車両の約60%を同営業所のスポットに割当
  const assignableInStock = shuffle(inStockVehicleIds).slice(0, Math.ceil(inStockVehicleIds.length * 0.6));
  // MAINTENANCE車両の一部も割当
  const assignableMaint = shuffle(maintenanceVehicleIds).slice(0, Math.ceil(maintenanceVehicleIds.length * 0.5));
  const allAssignable = [...assignableInStock, ...assignableMaint];

  // 各営業所のスポット使用状況を追跡
  const spotUsed: Map<string, number> = new Map(); // officeId -> 次に使えるspotのindex
  for (const [officeId] of allSpotsByOffice) {
    spotUsed.set(officeId, 0);
  }

  for (const vId of allAssignable) {
    const officeId = vehicleOfficeMap.get(vId);
    if (!officeId) continue;
    const spots = allSpotsByOffice.get(officeId);
    if (!spots) continue;
    const idx = spotUsed.get(officeId) ?? 0;
    if (idx >= spots.length) continue; // スポット満杯

    await prisma.vehicle.update({
      where: { id: vId },
      data: { parkingSpotId: spots[idx] },
    });
    spotUsed.set(officeId, idx + 1);
    assignCount++;
  }
  console.log(`  ${assignCount}台割当`);

  // =============================================
  // 16. (Phase 10: Order/Sale 削除により不要)
  // =============================================

  // =============================================
  // 17. 決済端末マスタ (20件: 各営業所2台)
  // =============================================
  console.log("決済端末マスタを生成中...");
  const TERMINAL_TYPES: ("MULTI" | "CREDIT_CARD" | "QR_PAYMENT" | "ELECTRONIC_MONEY")[] = [
    "MULTI", "CREDIT_CARD", "QR_PAYMENT", "ELECTRONIC_MONEY",
  ];
  const PROVIDERS = ["GMO", "Square", "PayPay", "楽天ペイ", "Stripe"];
  const TERMINAL_MODEL_NAMES = ["Verifone VX520", "Square Reader", "PAX A920", "STAR mPOP", "SumUp Air"];

  const terminalIds: string[] = [];
  for (let i = 0; i < 20; i++) {
    const office = offices[Math.floor(i / 2)]; // 各営業所ちょうど2台
    const terminal = await prisma.paymentTerminal.create({
      data: {
        terminalCode: `TM-${padCode(i + 1, 5)}`,
        terminalName: `${office.officeName}端末-${(i % 2) + 1}`,
        terminalType: i % 2 === 0 ? "MULTI" : pick(TERMINAL_TYPES),
        provider: Math.random() > 0.3 ? pick(PROVIDERS) : null,
        modelName: Math.random() > 0.3 ? pick(TERMINAL_MODEL_NAMES) : null,
        serialNumber: `SN${padCode(randomInt(100000, 999999), 6)}`,
        officeId: office.id,
        status: pick(["ACTIVE", "ACTIVE", "ACTIVE", "INACTIVE", "MAINTENANCE"] as const),
        note: Math.random() < 0.1 ? "メモ: 定期メンテナンス予定" : null,
      },
    });
    terminalIds.push(terminal.id);
  }
  console.log(`  ${terminalIds.length}件`);

  // =============================================
  // 18. 料金プランマスタ (16件: 8クラス x 2期)
  // =============================================
  console.log("料金プランマスタを生成中...");

  // classId -> classCode の逆引きマップ
  const classIdToCode = new Map<string, string>();
  for (const [code, id] of classMap) classIdToCode.set(id, code);

  const ratePlanBatch: Array<{
    vehicleClassId: string;
    planName: string;
    rateType: "DAILY";
    basePrice: number;
    additionalHourPrice: number;
    insurancePrice: number;
    validFrom: Date;
    validTo: Date | null;
    isActive: boolean;
  }> = [];

  for (const [classCode, data] of Object.entries(RATE_PLAN_DATA)) {
    const vcId = classMap.get(classCode);
    if (!vcId) continue;

    // 通常期
    ratePlanBatch.push({
      vehicleClassId: vcId,
      planName: `${data.className} 通常期`,
      rateType: "DAILY",
      basePrice: data.rates.h24,
      additionalHourPrice: data.rates.perHour,
      insurancePrice: data.cdw,
      validFrom: new Date(2025, 3, 1), // 2025-04-01
      validTo: null,
      isActive: true,
    });

    // 繁忙期（夏季 20%増）
    ratePlanBatch.push({
      vehicleClassId: vcId,
      planName: `${data.className} 繁忙期（夏季）`,
      rateType: "DAILY",
      basePrice: Math.floor(data.rates.h24 * 1.2),
      additionalHourPrice: Math.floor(data.rates.perHour * 1.2),
      insurancePrice: data.cdw,
      validFrom: new Date(2025, 6, 15), // 2025-07-15
      validTo: new Date(2025, 8, 15),   // 2025-09-15
      isActive: true,
    });
  }

  await prisma.ratePlan.createMany({ data: ratePlanBatch });
  console.log(`  ${ratePlanBatch.length}件`);

  // =============================================
  // 19. オプション料金マスタ (8件)
  // =============================================
  console.log("オプション料金マスタを生成中...");

  await prisma.rateOption.createMany({
    data: RATE_OPTION_DATA.map(o => ({
      optionName: o.optionName,
      price: o.price,
      isActive: true,
    })),
  });

  const rateOptions = await prisma.rateOption.findMany();
  const rateOptionMap = new Map<string, { id: string; price: number; optionName: string; perDay: boolean }>();
  for (const ro of rateOptions) {
    const optData = RATE_OPTION_DATA.find(d => d.optionName === ro.optionName);
    rateOptionMap.set(ro.id, { id: ro.id, price: ro.price, optionName: ro.optionName, perDay: optData?.perDay ?? false });
  }
  const rateOptionIds = rateOptions.map(ro => ro.id);
  console.log(`  ${rateOptions.length}件`);

  // =============================================
  // 20. 予約データ (100件) + 新フィールド（customerCode, entityType, channel等）
  // =============================================
  console.log("予約データを生成中...");

  // チャネル選択肢
  const RESERVATION_CHANNELS = ["WEB", "PHONE", "WALK_IN", "AGENT"];

  // 顧客名候補（レンタカー利用者）
  const RENTAL_CUSTOMERS = [
    { name: "佐藤 太郎", kana: "サトウ タロウ" },
    { name: "鈴木 一郎", kana: "スズキ イチロウ" },
    { name: "田中 健一", kana: "タナカ ケンイチ" },
    { name: "高橋 雄大", kana: "タカハシ ユウダイ" },
    { name: "伊藤 翔太", kana: "イトウ ショウタ" },
    { name: "渡辺 大輔", kana: "ワタナベ ダイスケ" },
    { name: "山本 直樹", kana: "ヤマモト ナオキ" },
    { name: "中村 隆", kana: "ナカムラ タカシ" },
    { name: "小林 裕子", kana: "コバヤシ ユウコ" },
    { name: "加藤 真由美", kana: "カトウ マユミ" },
    { name: "吉田 和也", kana: "ヨシダ カズヤ" },
    { name: "山田 達也", kana: "ヤマダ タツヤ" },
    { name: "松本 誠", kana: "マツモト マコト" },
    { name: "井上 浩二", kana: "イノウエ コウジ" },
    { name: "木村 陽子", kana: "キムラ ヨウコ" },
    { name: "林 明美", kana: "ハヤシ アケミ" },
    { name: "斎藤 太郎", kana: "サイトウ タロウ" },
    { name: "清水 健一", kana: "シミズ ケンイチ" },
    { name: "山口 翔太", kana: "ヤマグチ ショウタ" },
    { name: "松田 大輔", kana: "マツダ ダイスケ" },
  ];

  // ステータス分布: RESERVED:15, CONFIRMED:20, DEPARTED:10, RETURNED:10, SETTLED:30, CANCELLED:10, NO_SHOW:5
  type ResStatus = "RESERVED" | "CONFIRMED" | "DEPARTED" | "RETURNED" | "SETTLED" | "CANCELLED" | "NO_SHOW";
  const reservationStatuses: ResStatus[] = shuffle([
    ...Array(15).fill("RESERVED" as const),
    ...Array(20).fill("CONFIRMED" as const),
    ...Array(10).fill("DEPARTED" as const),
    ...Array(10).fill("RETURNED" as const),
    ...Array(30).fill("SETTLED" as const),
    ...Array(10).fill("CANCELLED" as const),
    ...Array(5).fill("NO_SHOW" as const),
  ]);

  // 承認ステータス分布: 大半 APPROVED、一部 PENDING
  type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
  const approvalStatuses: ApprovalStatus[] = shuffle([
    ...Array(90).fill("APPROVED" as const),
    ...Array(8).fill("PENDING" as const),
    ...Array(2).fill("REJECTED" as const),
  ]);

  // vehicleClassId別の利用可能車両リストを構築
  const vehiclesByClass = new Map<string, string[]>();
  const allVehicles = await prisma.vehicle.findMany({
    where: { status: "IN_STOCK" },
    select: { id: true, vehicleClassId: true },
  });
  for (const v of allVehicles) {
    if (!v.vehicleClassId) continue;
    const list = vehiclesByClass.get(v.vehicleClassId) || [];
    list.push(v.id);
    vehiclesByClass.set(v.vehicleClassId, list);
  }

  // 車両クラスIDリスト
  const vcIds = vehicleClasses.map(vc => vc.id);
  // 車両割り当て追跡（DEPARTED用: 同一車両の重複防止）
  const departedVehicleIds = new Set<string>();

  const createdReservations: { id: string; status: ResStatus; entityType: number; settledAt: Date | null; actualAmount: number | null; taxAmount: number | null; customerName: string; classCode: string; durationDays: number }[] = [];

  let reservationCount = 0;
  for (let i = 0; i < 100; i++) {
    const status = reservationStatuses[i];
    const approvalStatus = approvalStatuses[i];
    const customer = pick(RENTAL_CUSTOMERS);
    const vcId = pick(vcIds);
    const pickupOffice = pick(offices);
    // 90%は同一営業所返却、10%は乗り捨て
    const returnOffice = Math.random() < 0.9 ? pickupOffice : pick(offices);

    // entityType: 1=個人 70%, 2=法人 30%
    const entityType = Math.random() < 0.7 ? 1 : 2;
    const companyCode = entityType === 2 ? pick(companies).code : null;
    const customerCode = entityType === 2 ? `CUST-${padCode(randomInt(1, 500), 3)}` : null;
    const channel = pick(RESERVATION_CHANNELS);

    // 日付を生成（ステータスに応じた適切な範囲）
    let pickupDate: Date;
    let returnDate: Date;
    const now = new Date(2026, 1, 19); // 2026-02-19

    if (status === "SETTLED" || status === "RETURNED") {
      // 過去の予約（2025年10月〜2026年1月）
      pickupDate = new Date(2025, 9 + randomInt(0, 3), randomInt(1, 28), randomInt(8, 12), 0);
      const durationDays = randomInt(1, 7);
      returnDate = new Date(pickupDate.getTime() + durationDays * 86400000);
    } else if (status === "DEPARTED") {
      // 現在出発中（2026年2月中旬〜）
      pickupDate = new Date(2026, 1, randomInt(15, 18), randomInt(8, 12), 0);
      const durationDays = randomInt(2, 5);
      returnDate = new Date(pickupDate.getTime() + durationDays * 86400000);
    } else if (status === "CANCELLED" || status === "NO_SHOW") {
      // 過去・未来混在
      const monthOffset = randomInt(-3, 2);
      pickupDate = new Date(2026, 1 + monthOffset, randomInt(1, 28), randomInt(8, 18), 0);
      returnDate = new Date(pickupDate.getTime() + randomInt(1, 5) * 86400000);
    } else {
      // RESERVED / CONFIRMED: 未来の予約（2026年2月下旬〜4月）
      pickupDate = new Date(2026, 1 + randomInt(0, 2), randomInt(20, 28), randomInt(8, 18), 0);
      const durationDays = randomInt(1, 7);
      returnDate = new Date(pickupDate.getTime() + durationDays * 86400000);
    }

    // 車両割当（CONFIRMED/DEPARTED/RETURNED/SETTLED は車両あり）
    let vehicleId: string | null = null;
    const needsVehicle = ["CONFIRMED", "DEPARTED", "RETURNED", "SETTLED"].includes(status);
    if (needsVehicle) {
      const classVehicles = vehiclesByClass.get(vcId);
      if (classVehicles && classVehicles.length > 0) {
        if (status === "DEPARTED") {
          // DEPARTED: 重複防止
          const available = classVehicles.filter(id => !departedVehicleIds.has(id));
          if (available.length > 0) {
            vehicleId = pick(available);
            departedVehicleIds.add(vehicleId);
          } else {
            vehicleId = pick(classVehicles);
          }
        } else {
          vehicleId = pick(classVehicles);
        }
      }
    }

    // 金額（車両クラス × 利用日数ベースで算出）
    const resClassCode = classIdToCode.get(vcId) ?? "CL-00002";
    const rental = calcRentalAmount(resClassCode, pickupDate, returnDate);
    const estimatedAmount = rental.baseAmount + rental.cdwAmount;
    let actualAmount: number | null = null;
    let taxAmount: number | null = null;
    let actualPickupDate: Date | null = null;
    let actualReturnDate: Date | null = null;
    let departureOdometer: number | null = null;
    let returnOdometer: number | null = null;
    let settledAt: Date | null = null;
    let revenueDate: Date | null = null;
    const planData = RATE_PLAN_DATA[resClassCode];
    const perHour = planData?.rates.perHour ?? 1320;

    if (status === "DEPARTED") {
      actualPickupDate = new Date(pickupDate.getTime() + randomInt(-30, 30) * 60000);
      departureOdometer = randomInt(10000, 80000);
    } else if (status === "RETURNED") {
      actualPickupDate = new Date(pickupDate.getTime() + randomInt(-30, 30) * 60000);
      actualReturnDate = new Date(returnDate.getTime() + randomInt(-60, 120) * 60000);
      departureOdometer = randomInt(10000, 80000);
      returnOdometer = departureOdometer + randomInt(50, 500);
      // 超過0-2時間分の変動
      actualAmount = estimatedAmount + randomInt(0, 2) * perHour;
      taxAmount = Math.floor(actualAmount * 0.1);
    } else if (status === "SETTLED") {
      actualPickupDate = new Date(pickupDate.getTime() + randomInt(-30, 30) * 60000);
      actualReturnDate = new Date(returnDate.getTime() + randomInt(-60, 120) * 60000);
      departureOdometer = randomInt(10000, 80000);
      returnOdometer = departureOdometer + randomInt(50, 500);
      // 超過0-2時間分の変動
      actualAmount = estimatedAmount + randomInt(0, 2) * perHour;
      taxAmount = Math.floor(actualAmount * 0.1);
      settledAt = new Date(actualReturnDate.getTime() + randomInt(0, 7200000)); // 精算は返却後2時間以内
      // 法人は請求書発行（売上計上日は請求書の支払期日）、個人は即日売上
      revenueDate = entityType === 1 ? settledAt : null;
    }

    const reservation = await prisma.reservation.create({
      data: {
        reservationCode: `RS-${padCode(i + 1, 5)}`,
        status,
        vehicleClassId: vcId,
        vehicleId,
        customerName: customer.name,
        customerNameKana: customer.kana,
        customerPhone: `090-${padCode(randomInt(1000, 9999), 4)}-${padCode(randomInt(1000, 9999), 4)}`,
        customerEmail: Math.random() < 0.6 ? `${customer.name.split(" ")[1]}${randomInt(1, 99)}@example.com` : null,
        pickupDate,
        returnDate,
        actualPickupDate,
        actualReturnDate,
        pickupOfficeId: pickupOffice.id,
        returnOfficeId: returnOffice.id,
        departureOdometer,
        returnOdometer,
        estimatedAmount,
        actualAmount,
        taxAmount,
        settledAt,
        revenueDate,
        customerCode,
        entityType,
        companyCode,
        channel,
        accountId: companyCode ? (accountLegacyMap.get(companyCode) ?? null) : null,
        approvalStatus,
        approvedById: approvalStatus === "APPROVED" ? "test-admin-001" : null,
        approvedAt: approvalStatus === "APPROVED" ? new Date(pickupDate.getTime() - 86400000 * randomInt(1, 3)) : null,
        approvalComment: approvalStatus === "REJECTED" ? "条件不備のため却下" : null,
        note: Math.random() < 0.1 ? "備考メモ" : null,
      },
    });

    createdReservations.push({
      id: reservation.id,
      status,
      entityType,
      settledAt,
      actualAmount,
      taxAmount,
      customerName: customer.name,
      classCode: resClassCode,
      durationDays: rental.durationDays,
    });
    reservationCount++;
  }
  console.log(`  ${reservationCount}件`);

  // =============================================
  // 21. 予約オプション (~35件)
  // =============================================
  console.log("予約オプションを生成中...");

  const reservationOptionTotals = new Map<string, number>(); // reservationId -> オプション合計金額
  let resOptionCount = 0;

  for (const res of createdReservations) {
    // キャンセル・ノーショー以外の35%にオプションを付与
    if (res.status === "CANCELLED" || res.status === "NO_SHOW") continue;
    if (Math.random() > 0.35) continue;

    const optCount = randomInt(1, 3);
    const selectedOptionIds = shuffle([...rateOptionIds]).slice(0, optCount);
    let optionTotal = 0;

    for (const optId of selectedOptionIds) {
      const optData = rateOptionMap.get(optId);
      if (!optData) continue;
      const qty = optData.perDay ? res.durationDays : 1;
      const unitPrice = optData.price;
      const lineTotal = qty * unitPrice;
      optionTotal += lineTotal;

      await prisma.reservationOption.create({
        data: {
          reservationId: res.id,
          optionId: optId,
          quantity: qty,
          unitPrice,
        },
      });
      resOptionCount++;
    }

    if (optionTotal > 0) {
      reservationOptionTotals.set(res.id, optionTotal);
      // 予約金額にオプション料金を加算
      const newActualAmount = res.actualAmount !== null ? res.actualAmount + optionTotal : null;
      const newTaxAmount = newActualAmount !== null ? Math.floor(newActualAmount * 0.1) : null;
      await prisma.reservation.update({
        where: { id: res.id },
        data: {
          estimatedAmount: { increment: optionTotal },
          ...(newActualAmount !== null ? { actualAmount: newActualAmount, taxAmount: newTaxAmount } : {}),
        },
      });
      // ローカルデータも更新
      if (res.actualAmount !== null) {
        res.actualAmount = newActualAmount;
        res.taxAmount = newTaxAmount;
      }
    }
  }
  console.log(`  ${resOptionCount}件`);

  // =============================================
  // 22. 請求書（法人向け精算済予約に対して）
  // =============================================
  console.log("請求書を生成中...");

  // SETTLED かつ entityType=2（法人）の予約を取得
  const corporateSettledReservations = createdReservations.filter(
    r => r.status === "SETTLED" && r.entityType === 2 && r.actualAmount !== null
  );

  // ステータス分布: DRAFT:20%, ISSUED:40%, PAID:40%
  type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID";
  const invoiceStatuses: InvoiceStatus[] = shuffle([
    ...Array(Math.ceil(corporateSettledReservations.length * 0.2)).fill("DRAFT" as const),
    ...Array(Math.ceil(corporateSettledReservations.length * 0.4)).fill("ISSUED" as const),
    ...Array(corporateSettledReservations.length - Math.ceil(corporateSettledReservations.length * 0.6)).fill("PAID" as const),
  ]);

  let invoiceCount = 0;
  for (let i = 0; i < corporateSettledReservations.length; i++) {
    const res = corporateSettledReservations[i];
    const invoiceStatus = invoiceStatuses[i] || "DRAFT";
    const amount = res.actualAmount ?? 0;
    const taxAmount = res.taxAmount ?? 0;
    const totalAmount = amount + taxAmount;

    const issueDate = res.settledAt ? new Date(res.settledAt.getTime() + randomInt(0, 86400000)) : new Date();
    const dueDate = new Date(issueDate.getTime() + randomInt(14, 45) * 86400000); // 14-45日後

    // 取引先を紐づけ（法人の場合、先頭20社のCompanyにマッチすれば）
    const invoiceCompany = pick(companies.slice(0, 20));
    const invoiceAccountId = accountLegacyMap.get(invoiceCompany.code) ?? null;

    // 明細行データ（料金プランベース）
    const invClassCode = res.classCode;
    const invRental = calcRentalAmount(invClassCode, new Date(), new Date(Date.now() + res.durationDays * 86400000));
    const invClassName = invRental.className;
    const invoiceLines: Array<{ sortOrder: number; description: string; quantity: number; unitPrice: number; amount: number; taxRate: number; taxAmount: number }> = [];
    let linesSubtotal = 0;
    let linesTaxTotal = 0;
    let sortIdx = 0;

    // L1: レンタカー基本料金
    const invPlanData = RATE_PLAN_DATA[invClassCode];
    const invBaseUnitPrice = invPlanData?.rates.h24 ?? 8580;
    const invBaseAmount = invBaseUnitPrice * res.durationDays;
    const invBaseTax = Math.floor(invBaseAmount * 0.1);
    linesSubtotal += invBaseAmount;
    linesTaxTotal += invBaseTax;
    invoiceLines.push({ sortOrder: sortIdx++, description: `レンタカー基本料金（${invClassName} ${res.durationDays}日間）`, quantity: res.durationDays, unitPrice: invBaseUnitPrice, amount: invBaseAmount, taxRate: 0.1, taxAmount: invBaseTax });

    // L2: 免責補償料（CDW）
    const invCdwPerDay = invPlanData?.cdw ?? 1100;
    const invCdwAmount = invCdwPerDay * res.durationDays;
    const invCdwTax = Math.floor(invCdwAmount * 0.1);
    linesSubtotal += invCdwAmount;
    linesTaxTotal += invCdwTax;
    invoiceLines.push({ sortOrder: sortIdx++, description: "免責補償料（CDW）", quantity: res.durationDays, unitPrice: invCdwPerDay, amount: invCdwAmount, taxRate: 0.1, taxAmount: invCdwTax });

    // L3: オプション料金（あれば）
    const invOptionTotal = reservationOptionTotals.get(res.id) ?? 0;
    if (invOptionTotal > 0) {
      const invOptTax = Math.floor(invOptionTotal * 0.1);
      linesSubtotal += invOptionTotal;
      linesTaxTotal += invOptTax;
      invoiceLines.push({ sortOrder: sortIdx++, description: "オプション料金", quantity: 1, unitPrice: invOptionTotal, amount: invOptionTotal, taxRate: 0.1, taxAmount: invOptTax });
    }

    // L4: 超過料金（10%確率）
    if (Math.random() < 0.1) {
      const overtimeHours = randomInt(1, 3);
      const overtimeRate = invPlanData?.rates.perHour ?? 1320;
      const overtimeAmount = overtimeHours * overtimeRate;
      const overtimeTax = Math.floor(overtimeAmount * 0.1);
      linesSubtotal += overtimeAmount;
      linesTaxTotal += overtimeTax;
      invoiceLines.push({ sortOrder: sortIdx++, description: `超過料金（${overtimeHours}時間）`, quantity: overtimeHours, unitPrice: overtimeRate, amount: overtimeAmount, taxRate: 0.1, taxAmount: overtimeTax });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `IV-${padCode(invoiceCount + 1, 5)}`,
        reservationId: res.id,
        customerName: invoiceCompany.officialName,
        customerCode: `CUST-${padCode(randomInt(1, 500), 3)}`,
        companyCode: invoiceCompany.code,
        accountId: invoiceAccountId,
        issueDate,
        dueDate,
        amount: linesSubtotal,
        taxAmount: linesTaxTotal,
        totalAmount: linesSubtotal + linesTaxTotal,
        status: invoiceStatus,
        paidAt: invoiceStatus === "PAID" ? new Date(dueDate.getTime() + randomInt(0, 7) * 86400000) : null,
        note: Math.random() < 0.1 ? "振込手数料はお客様負担" : null,
        lines: { create: invoiceLines },
      },
    });

    // 請求書作成時に reservation.revenueDate を更新
    await prisma.reservation.update({
      where: { id: res.id },
      data: { revenueDate: dueDate },
    });

    invoiceCount++;
  }
  console.log(`  ${invoiceCount}件`);

  // =============================================
  // 22. 見積書 (15件) + 見積明細行
  // =============================================
  console.log("見積書を生成中...");

  type QtStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "REJECTED";
  const quotationStatuses: QtStatus[] = shuffle([
    ...Array(3).fill("DRAFT" as const),
    ...Array(4).fill("SENT" as const),
    ...Array(5).fill("ACCEPTED" as const),
    ...Array(2).fill("EXPIRED" as const),
    ...Array(1).fill("REJECTED" as const),
  ]);

  let quotationCount = 0;
  const usedReservationIds = new Set<string>();
  for (let i = 0; i < 15; i++) {
    const qtStatus = quotationStatuses[i];
    const accountId = corporateAccountIds[i % corporateAccountIds.length];
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { accountName: true, accountNameKana: true } });
    const vcId = pick(vcIds);
    const pickupOffice = pick(offices);
    const returnOffice = Math.random() < 0.9 ? pickupOffice : pick(offices);
    const pickupDate = new Date(2026, randomInt(2, 5), randomInt(1, 28), randomInt(8, 18), 0);
    const returnDate = new Date(pickupDate.getTime() + randomInt(1, 7) * 86400000);

    // 明細行（料金プランベース）
    const qtClassCode = classIdToCode.get(vcId) ?? "CL-00002";
    const qtRental = calcRentalAmount(qtClassCode, pickupDate, returnDate);
    const qtPlanData = RATE_PLAN_DATA[qtClassCode];
    const lines: Array<{ sortOrder: number; description: string; quantity: number; unitPrice: number; amount: number; taxRate: number; taxAmount: number }> = [];
    let subTotal = 0;
    let taxTotal = 0;
    let qtSortIdx = 0;

    // L1: レンタカー基本料金
    const qtBaseUnitPrice = qtPlanData?.rates.h24 ?? 8580;
    const qtBaseAmount = qtBaseUnitPrice * qtRental.durationDays;
    const qtBaseTax = Math.floor(qtBaseAmount * 0.1);
    subTotal += qtBaseAmount;
    taxTotal += qtBaseTax;
    lines.push({ sortOrder: qtSortIdx++, description: `レンタカー基本料金（${qtRental.className} ${qtRental.durationDays}日間）`, quantity: qtRental.durationDays, unitPrice: qtBaseUnitPrice, amount: qtBaseAmount, taxRate: 0.1, taxAmount: qtBaseTax });

    // L2: 免責補償料（CDW）
    const qtCdwPerDay = qtPlanData?.cdw ?? 1100;
    const qtCdwAmount = qtCdwPerDay * qtRental.durationDays;
    const qtCdwTax = Math.floor(qtCdwAmount * 0.1);
    subTotal += qtCdwAmount;
    taxTotal += qtCdwTax;
    lines.push({ sortOrder: qtSortIdx++, description: "免責補償料（CDW）", quantity: qtRental.durationDays, unitPrice: qtCdwPerDay, amount: qtCdwAmount, taxRate: 0.1, taxAmount: qtCdwTax });

    // L3: ランダムオプション（50%確率）
    if (Math.random() < 0.5) {
      const qtOpt = pick(RATE_OPTION_DATA);
      const qtOptQty = qtOpt.perDay ? qtRental.durationDays : 1;
      const qtOptAmount = qtOpt.price * qtOptQty;
      const qtOptTax = Math.floor(qtOptAmount * 0.1);
      subTotal += qtOptAmount;
      taxTotal += qtOptTax;
      lines.push({ sortOrder: qtSortIdx++, description: qtOpt.optionName, quantity: qtOptQty, unitPrice: qtOpt.price, amount: qtOptAmount, taxRate: 0.1, taxAmount: qtOptTax });
    }

    // L4: NOC補償（20%確率）
    if (Math.random() < 0.2) {
      const nocPerDay = 440;
      const nocAmount = nocPerDay * qtRental.durationDays;
      const nocTax = Math.floor(nocAmount * 0.1);
      subTotal += nocAmount;
      taxTotal += nocTax;
      lines.push({ sortOrder: qtSortIdx++, description: "NOC補償", quantity: qtRental.durationDays, unitPrice: nocPerDay, amount: nocAmount, taxRate: 0.1, taxAmount: nocTax });
    }

    // ACCEPTED の見積書は予約変換済みを想定（一部）
    let reservationId: string | null = null;
    if (qtStatus === "ACCEPTED") {
      // 未使用の RESERVED/CONFIRMED 予約を紐づけ
      const matchingRes = createdReservations.find(
        r => (r.status === "RESERVED" || r.status === "CONFIRMED") && r.entityType === 2 && !usedReservationIds.has(r.id)
      );
      if (matchingRes) {
        reservationId = matchingRes.id;
        usedReservationIds.add(matchingRes.id);
      }
    }

    await prisma.quotation.create({
      data: {
        quotationCode: `QT-${padCode(i + 1, 5)}`,
        accountId,
        status: qtStatus,
        title: `${account?.accountName ?? "取引先"} 様向け見積書`,
        customerName: account?.accountName ?? "取引先",
        vehicleClassId: vcId,
        pickupDate,
        returnDate,
        pickupOfficeId: pickupOffice.id,
        returnOfficeId: returnOffice.id,
        amount: subTotal,
        taxAmount: taxTotal,
        totalAmount: subTotal + taxTotal,
        validUntil: new Date(pickupDate.getTime() - randomInt(3, 14) * 86400000),
        note: Math.random() < 0.2 ? "お見積り有効期限にご注意ください" : null,
        reservationId,
        lines: { create: lines },
      },
    });
    quotationCount++;
  }
  console.log(`  ${quotationCount}件`);

  // =============================================
  // 24. 入金記録 (~200件) — 予約/請求書ベースの金額
  // =============================================
  console.log("入金記録を生成中...");
  const PAYMENT_CAT_WEIGHTS: ("BANK_TRANSFER" | "CREDIT_CARD" | "CASH" | "ELECTRONIC_MONEY" | "QR_PAYMENT")[] = [
    ...Array(8).fill("BANK_TRANSFER" as const),
    ...Array(5).fill("CREDIT_CARD" as const),
    ...Array(3).fill("CASH" as const),
    ...Array(2).fill("ELECTRONIC_MONEY" as const),
    ...Array(2).fill("QR_PAYMENT" as const),
  ];

  const CREDIT_CARD_PROVIDERS = ["VISA", "Mastercard", "JCB", "American Express", "Diners Club"];
  const ELECTRONIC_MONEY_PROVIDERS = ["Suica", "PASMO", "iD", "QUICPay", "nanaco", "WAON"];
  const QR_PAYMENT_PROVIDERS = ["PayPay", "LINE Pay", "楽天ペイ", "au PAY", "d払い", "メルペイ"];

  // 精算済予約とその金額リスト
  const settledForPayment = createdReservations.filter(r => r.status === "SETTLED" && r.actualAmount !== null);
  // 請求書の金額リスト
  const invoicesForPayment = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "PAID"] } },
    select: { id: true, totalAmount: true, customerName: true },
  });

  const paymentIds: string[] = [];
  const paymentAmounts: Map<string, number> = new Map();

  for (let i = 0; i < 200; i++) {
    const category = pick(PAYMENT_CAT_WEIGHTS);
    let provider: string | null = null;
    let terminalId: string | null = null;

    if (category === "CREDIT_CARD") {
      provider = pick(CREDIT_CARD_PROVIDERS);
      terminalId = Math.random() > 0.2 ? pick(terminalIds) : null;
    } else if (category === "ELECTRONIC_MONEY") {
      provider = pick(ELECTRONIC_MONEY_PROVIDERS);
      terminalId = Math.random() > 0.2 ? pick(terminalIds) : null;
    } else if (category === "QR_PAYMENT") {
      provider = pick(QR_PAYMENT_PROVIDERS);
      terminalId = Math.random() > 0.2 ? pick(terminalIds) : null;
    }

    const month = pick(MONTHS);
    const paymentDate = dateInMonth(FISCAL_YEAR, month);

    // 金額: 予約連動 → 請求書連動 → 雑入金
    let amount: number;
    let payerName: string;
    if (i < settledForPayment.length) {
      // 予約の actualAmount + taxAmount に連動
      const sRes = settledForPayment[i];
      amount = (sRes.actualAmount ?? 0) + (sRes.taxAmount ?? 0);
      payerName = sRes.customerName;
    } else if (i - settledForPayment.length < invoicesForPayment.length) {
      // 請求書の totalAmount に連動
      const inv = invoicesForPayment[i - settledForPayment.length];
      amount = inv.totalAmount;
      payerName = inv.customerName;
    } else {
      // 雑入金（5千〜5万円）
      amount = randomInt(5, 50) * 1000;
      payerName = Math.random() > 0.5
        ? pick(companies).officialName
        : generatePersonName().kanji;
    }

    const payment = await prisma.payment.create({
      data: {
        paymentNumber: `PM-${padCode(i + 1, 5)}`,
        paymentDate,
        amount,
        paymentCategory: category,
        paymentProvider: provider,
        payerName,
        terminalId,
        externalId: Math.random() < 0.2 ? `MF-PAY-${randomInt(100000, 999999)}` : null,
        note: Math.random() < 0.05 ? "備考メモ" : null,
      },
    });
    paymentIds.push(payment.id);
    paymentAmounts.set(payment.id, amount);
  }
  console.log(`  ${paymentIds.length}件`);

  // =============================================
  // 25. 消込明細（予約ベース）
  // =============================================
  console.log("消込明細を生成中...");
  const settledReservations = await prisma.reservation.findMany({
    where: { status: "SETTLED", actualAmount: { not: null } },
    select: { id: true, actualAmount: true, taxAmount: true },
  });

  let allocationCount = 0;
  for (let i = 0; i < Math.min(settledReservations.length, paymentIds.length); i++) {
    const reservation = settledReservations[i];
    const paymentId = paymentIds[i % paymentIds.length];
    const reservationTotal = (reservation.actualAmount ?? 0) + (reservation.taxAmount ?? 0);

    // 60%の確率で消込を作成
    if (Math.random() < 0.6 && reservationTotal > 0) {
      const isFullAllocation = Math.random() < 0.7;
      const allocatedAmount = isFullAllocation
        ? reservationTotal
        : Math.floor(reservationTotal * randomInt(30, 80) / 100);

      await prisma.paymentAllocation.create({
        data: {
          paymentId,
          reservationId: reservation.id,
          allocatedAmount,
        },
      });
      allocationCount++;
    }
  }
  console.log(`  ${allocationCount}件`);

  // --- 完了サマリ ---
  console.log("\n生成結果サマリ:");
  const counts = await Promise.all([
    prisma.office.count(),
    prisma.company.count(),
    prisma.customer.count(),
    prisma.dailyReportDealer.count(),
    prisma.salesRepAssignment.count(),
    prisma.reservationTarget.count(),
    prisma.salesTarget.count(),
    prisma.exclusionRule.count(),
    prisma.user.count(),
    prisma.account.count(),
    prisma.vehicleClass.count(),
    prisma.vehicle.count(),
    prisma.leaseContract.count(),
    prisma.leaseContractLine.count(),
    prisma.vehicleInspection.count(),
    prisma.parkingLot.count(),
    prisma.parkingSpot.count(),
    prisma.paymentTerminal.count(),
    prisma.ratePlan.count(),
    prisma.rateOption.count(),
    prisma.reservation.count(),
    prisma.reservationOption.count(),
    prisma.invoice.count(),
    prisma.invoiceLine.count(),
    prisma.quotation.count(),
    prisma.quotationLine.count(),
    prisma.payment.count(),
    prisma.paymentAllocation.count(),
  ]);

  const labels = [
    "営業所マスタ", "会社マスタ", "顧客マスタ", "日報ディーラー", "担当営業マスタ",
    "予約目標", "売上目標", "除外条件", "ユーザー", "取引先",
    "車両クラス",
    "車両", "リース契約", "リース契約明細", "点検記録", "駐車場", "駐車枠",
    "決済端末", "料金プラン", "オプション料金",
    "予約", "予約オプション",
    "請求書", "請求書明細",
    "見積書", "見積書明細",
    "入金記録", "消込明細",
  ];

  labels.forEach((label, i) => {
    console.log(`  ${label}: ${counts[i].toLocaleString()}件`);
  });

  // --- 整合性チェック ---
  console.log("\n整合性チェック:");

  // LEASED車両でACTIVE契約明細がない件数
  const leasedWithoutContract = await prisma.vehicle.count({
    where: {
      status: "LEASED",
      leaseLines: { none: { contract: { status: "ACTIVE" } } },
    },
  });
  console.log(`  LEASED車両でACTIVE契約なし: ${leasedWithoutContract}件 (期待値: 0)`);

  // MAINTENANCE車両で未完了点検がない件数
  const maintWithoutInspection = await prisma.vehicle.count({
    where: {
      status: "MAINTENANCE",
      inspections: { none: { isCompleted: false } },
    },
  });
  console.log(`  MAINTENANCE車両で未完了点検なし: ${maintWithoutInspection}件 (期待値: 0)`);

  // 車両クラス未設定の車両件数
  const vehiclesWithoutClass = await prisma.vehicle.count({
    where: { vehicleClassId: null },
  });
  console.log(`  車両クラス未設定の車両: ${vehiclesWithoutClass}件 (期待値: 0)`);

  // 予約の整合性チェック
  const reservationsWithVehicle = await prisma.reservation.count({
    where: {
      status: { in: ["CONFIRMED", "DEPARTED", "RETURNED", "SETTLED"] },
      vehicleId: null,
    },
  });
  console.log(`  配車必須ステータスで車両未割当: ${reservationsWithVehicle}件 (期待値: 0)`);

  const reservationStatusCounts = await Promise.all([
    prisma.reservation.count({ where: { status: "RESERVED" } }),
    prisma.reservation.count({ where: { status: "CONFIRMED" } }),
    prisma.reservation.count({ where: { status: "DEPARTED" } }),
    prisma.reservation.count({ where: { status: "RETURNED" } }),
    prisma.reservation.count({ where: { status: "SETTLED" } }),
    prisma.reservation.count({ where: { status: "CANCELLED" } }),
    prisma.reservation.count({ where: { status: "NO_SHOW" } }),
  ]);
  console.log(`  予約ステータス分布: RESERVED=${reservationStatusCounts[0]} CONFIRMED=${reservationStatusCounts[1]} DEPARTED=${reservationStatusCounts[2]} RETURNED=${reservationStatusCounts[3]} SETTLED=${reservationStatusCounts[4]} CANCELLED=${reservationStatusCounts[5]} NO_SHOW=${reservationStatusCounts[6]}`);

  // 請求書の整合性チェック
  const invoiceStatusCounts = await Promise.all([
    prisma.invoice.count({ where: { status: "DRAFT" } }),
    prisma.invoice.count({ where: { status: "ISSUED" } }),
    prisma.invoice.count({ where: { status: "PAID" } }),
  ]);
  console.log(`  請求書ステータス分布: DRAFT=${invoiceStatusCounts[0]} ISSUED=${invoiceStatusCounts[1]} PAID=${invoiceStatusCounts[2]}`);

  const corporateReservationsWithoutInvoice = await prisma.reservation.count({
    where: {
      status: "SETTLED",
      entityType: 2,
      invoices: { none: {} },
    },
  });
  console.log(`  法人精算済で請求書なし: ${corporateReservationsWithoutInvoice}件 (期待値: 0)`);

  // 取引先・見積書の整合性チェック
  const accountTypeCounts = await Promise.all([
    prisma.account.count({ where: { accountType: "CORPORATE" } }),
    prisma.account.count({ where: { accountType: "INDIVIDUAL" } }),
  ]);
  console.log(`  取引先区分: 法人=${accountTypeCounts[0]} 個人=${accountTypeCounts[1]}`);

  const quotationStatusCounts = await Promise.all([
    prisma.quotation.count({ where: { status: "DRAFT" } }),
    prisma.quotation.count({ where: { status: "SENT" } }),
    prisma.quotation.count({ where: { status: "ACCEPTED" } }),
    prisma.quotation.count({ where: { status: "EXPIRED" } }),
    prisma.quotation.count({ where: { status: "REJECTED" } }),
  ]);
  console.log(`  見積書ステータス分布: DRAFT=${quotationStatusCounts[0]} SENT=${quotationStatusCounts[1]} ACCEPTED=${quotationStatusCounts[2]} EXPIRED=${quotationStatusCounts[3]} REJECTED=${quotationStatusCounts[4]}`);

  // 料金プラン・オプションの整合性チェック
  const ratePlanCount = await prisma.ratePlan.count();
  const rateOptionCount = await prisma.rateOption.count();
  const resOptionCountFinal = await prisma.reservationOption.count();
  console.log(`  料金プラン: ${ratePlanCount}件 (期待値: 16)`);
  console.log(`  オプション料金: ${rateOptionCount}件 (期待値: 8)`);
  console.log(`  予約オプション: ${resOptionCountFinal}件`);

  // 消込の整合性チェック
  const allocCountFinal = await prisma.paymentAllocation.count();
  console.log(`  消込明細: ${allocCountFinal}件 (期待値: >0)`);

  console.log("\nダミーデータの生成が完了しました。");
}

main()
  .catch((e) => {
    console.error("エラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
