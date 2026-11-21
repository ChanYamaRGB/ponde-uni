import path from "path";
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { DEFAULT_TEAM_NAME, normalizeHonors, levelOf, overPowerOf } from "./profile-store.mjs";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const ASSETS = path.join(__dirname, "..", "assets", "profile");

const fontPath = path.join(process.cwd(), "fonts", "NotoSansJP-Regular.ttf");
GlobalFonts.registerFromPath(fontPath, "Noto Sans JP");
const FONT = "'Noto Sans JP'";

// ===== 選択肢の定義（コマンドの choices と描画で共用） =====
export const BACKGROUND_VARIANTS = [
  { value: "rainbow", label: "虹" },
  { value: "platina", label: "プラチナ" },
  { value: "gold", label: "金" },
  { value: "silver", label: "銀" },
  { value: "normal", label: "ノーマル（ポゼッションなし）" }
];

export const CHARA_BG_VARIANTS = [
  { value: "holographic", label: "ホログラフィック" },
  { value: "rainbow", label: "虹" },
  { value: "platina", label: "プラチナ" },
  { value: "gold", label: "金" },
  { value: "silver", label: "銀" },
  { value: "copper", label: "銅" },
  { value: "normal", label: "ノーマル" }
];

export const TEAM_COLOR_VARIANTS = [
  { value: "gold", label: "金" },
  { value: "silver", label: "銀" },
  { value: "rainbow", label: "虹" },
  { value: "normal", label: "ノーマル" },
  { value: "red", label: "赤" },
  { value: "green", label: "緑" },
  { value: "yellow", label: "黄" },
  { value: "purple", label: "紫" }
];

export const HONOR_COLOR_VARIANTS = [
  { value: "rainbow", label: "虹" },
  { value: "platina", label: "プラチナ" },
  { value: "gold", label: "金" },
  { value: "silver", label: "銀" },
  { value: "copper", label: "銅" },
  { value: "normal", label: "ノーマル" },
  { value: "none", label: "なし" },
  { value: "expert", label: "EXPERT" },
  { value: "master", label: "MASTER" },
  { value: "ultima", label: "ULTIMA" },
  { value: "maimai", label: "maimai" },
  { value: "ongeki", label: "オンゲキ" },
  { value: "staff", label: "スタッフ" },
  { value: "phoenix_g", label: "フェニックス金" },
  { value: "phoenix_p", label: "フェニックス紫" },
  { value: "phoenix_r", label: "フェニックス赤" }
];

// 文字数制限は「全角=1、半角=0.5」の単位で数える。
// 称号はバーからはみ出して見切れないようにするための上限。
export const TEXT_MAX_UNITS = 16;

export function textUnits(text) {
  let units = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    // 半角カタカナとASCII等は0.5、それ以外は1
    units += (cp <= 0x7f || (cp >= 0xff61 && cp <= 0xff9f)) ? 0.5 : 1;
  }
  return units;
}

// プレイヤー名の制限（CHUNITHM の仕様）: 最大8文字、アルファベットと記号は全角のみ
export const NAME_MAX_CHARS = 8;
// チーム名の制限: 最大18文字
export const TEAM_NAME_MAX_CHARS = 18;

// 名前が制限に反していればエラーメッセージを、問題なければ null を返す
export function playerNameError(name) {
  if ([...name].length > NAME_MAX_CHARS) {
    return `名前は${NAME_MAX_CHARS}文字までです`;
  }
  // 半角の英字・数字・記号（ASCII）と半角カタカナを禁止する
  if (/[\u0020-\u007e\uff61-\uff9f]/.test(name)) {
    return "名前のアルファベットと記号は全角で入力してください";
  }
  return null;
}

const HALF_KANA = "ｱｲｳｴｵｧｨｩｪｫｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖｬｭｮﾗﾘﾙﾚﾛﾜﾝ";
const FULL_KANA = "アイウエオァィゥェォカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨャュョラリルレロワン";
const DAKUTEN_MAP = {
  "カ": "ガ", "キ": "ギ", "ク": "グ", "ケ": "ゲ", "コ": "ゴ",
  "サ": "ザ", "シ": "ジ", "ス": "ズ", "セ": "ゼ", "ソ": "ゾ",
  "タ": "ダ", "チ": "ヂ", "ツ": "ヅ", "テ": "デ", "ト": "ド",
  "ハ": "バ", "ヒ": "ビ", "フ": "ブ", "ヘ": "ベ", "ホ": "ボ", "ウ": "ヴ"
};
const HANDAKUTEN_MAP = { "ハ": "パ", "ヒ": "ピ", "フ": "プ", "ヘ": "ペ", "ホ": "ポ" };
const KANA_SPECIALS = {
  "｡": "。", "｢": "「", "｣": "」", "､": "、", "･": "・",
  "ｦ": "ヲ", "ｯ": "ッ", "ｰ": "ー", "ﾞ": "゛", "ﾟ": "゜"
};

// 半角の英字・数字・記号と半角カタカナを全角に変換する。
// デフォルト表示名（サーバーでの表示名）にも適用するため、描画時に使う。
export function toFullWidthName(text) {
  let out = "";
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cp = ch.codePointAt(0);
    if (cp >= 0x21 && cp <= 0x7e) {
      out += String.fromCodePoint(cp + 0xfee0);
      continue;
    }
    if (ch === " ") {
      out += "　";
      continue;
    }
    const kanaIdx = HALF_KANA.indexOf(ch);
    if (kanaIdx >= 0) {
      let kana = FULL_KANA[kanaIdx];
      const next = chars[i + 1];
      if (next === "ﾞ" && DAKUTEN_MAP[kana]) {
        kana = DAKUTEN_MAP[kana];
        i++;
      } else if (next === "ﾟ" && HANDAKUTEN_MAP[kana]) {
        kana = HANDAKUTEN_MAP[kana];
        i++;
      }
      out += kana;
      continue;
    }
    out += KANA_SPECIALS[ch] ?? ch;
  }
  return out;
}

// レーティングの値から数字画像の色を決める（本家CHUNITHMの色分け、VERSE以降）
// 緑 0.00- / 橙 4.00- / 赤 7.00- / 紫 10.00- / 銅 12.00- / 銀 13.25- /
// 金 14.50- / プラチナ 15.25- / 虹 16.00- / 虹極（kiwami）17.00-
export function ratingColorKey(rating) {
  if (rating >= 17) return "kiwami";
  if (rating >= 16) return "rainbow";
  if (rating >= 15.25) return "platinum";
  if (rating >= 14.5) return "gold";
  if (rating >= 13.25) return "silver";
  if (rating >= 12) return "bronze";
  if (rating >= 10) return "purple";
  if (rating >= 7) return "red";
  if (rating >= 4) return "orange";
  return "green";
}

// バトルランクのプレート（公式の種類と色に準拠）
// stops: グラデーション（虹色のみ横向き）、text: 文字色、border: 枠色
const RANK_PLATES = {
  D: { stops: [[0, "#9fd8f7"], [1, "#2273c4"]], text: "#ffffff" }, // 青系（水色〜青）
  C: { stops: [[0, "#93e29a"], [1, "#2b9e4b"]], text: "#ffffff" }, // 緑系
  B: { stops: [[0, "#ffe066"], [1, "#f59f00"]], text: "#4d2e00" }, // 黄系（オレンジ）
  A: { stops: [[0, "#ff8787"], [1, "#d92b2b"]], text: "#ffffff" }, // 赤系
  S: { stops: [[0, "#d3a6f5"], [1, "#862e9c"]], text: "#ffffff" }, // 紫系
  SS: { stops: [[0, "#ffffff"], [0.5, "#dfe5ea"], [1, "#a8b2ba"]], text: "#2f3b46", border: "#8a97a3" }, // 銀〜プラチナ系
  GOLD: { stops: [[0, "#fff3b0"], [0.5, "#e6c34a"], [1, "#b8860b"]], text: "#4d3800", border: "#8a6508" }, // バージョン固有（金系）
  FALLBACK: { stops: [[0, "#fffef8"], [1, "#fffef8"]], text: "#7f8c8d", border: "#7f8c8d" }
};

// ランク文字列に対応する公式画像（assets/profile からの相対パス）。無いランクは null
// 通常ランク: battlerank_<帯><数字>.png / 盟: battle_rank_ex<数字>.png / エリート: battlerank_Elite.png
function rankImageFile(rank) {
  const r = String(rank || "C3");
  if (r === "エリート") return "battlerank/battlerank_Elite.png";
  const ex = /^盟([1-3])$/.exec(r);
  if (ex) return `battlerank/battle_rank_ex${ex[1]}.png`;
  const band = /^(SS|[A-DS])([1-3])$/.exec(r.toUpperCase());
  if (band) return `battlerank/battlerank_${band[1]}${band[2]}.png`;
  return null;
}

// ランク文字列からプレートを引く（公式画像のない燦・煌・想は金系、旧形式はフォールバック）
function rankPlate(rank) {
  const r = String(rank || "C3");
  if (/^[燦煌想][1-3]$/.test(r)) return RANK_PLATES.GOLD;
  if (r.startsWith("SS")) return RANK_PLATES.SS;
  return RANK_PLATES[r.charAt(0).toUpperCase()] ?? RANK_PLATES.FALLBACK;
}

const imageCache = new Map();
async function assetImage(rel) {
  if (!imageCache.has(rel)) {
    imageCache.set(rel, await loadImage(path.join(ASSETS, rel)));
  }
  return imageCache.get(rel);
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// 収まるまでフォントサイズを下げる
function fitFont(ctx, text, maxWidth, baseSize, minSize, weight = "bold") {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

function formatLastPlay(ts) {
  if (!ts) return "----/--/-- --:--";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date(ts));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}/${p.month}/${p.day} ${p.hour}:${p.minute}`;
}

// data: profile-store のプロフィールデータ
// name: 表示名（カスタム名が無ければサーバーでの表示名）
// avatarImage: 読み込み済みのDiscordアバター画像（無ければ null）
export async function createProfileCard(data, name, avatarImage) {
  // 名前は本家に合わせて全角で表示する（デフォルト表示名の半角も変換する）
  name = toFullWidthName(name ?? "");

  const W = 420;
  const H = 264;
  const SCALE = 2;
  const canvas = createCanvas(W * SCALE, H * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const { level, star } = levelOf(data.msgCount);

  // ===== 全体背景（ポゼッション） =====
  const bg = await assetImage(`profile_${data.background}.png`);
  ctx.drawImage(bg, 0, 0, W, H);

  // ===== キャラクター背景＋アバター =====
  const charaBg = await assetImage(`bg_chara_${data.charaBg}.png`);
  ctx.drawImage(charaBg, 10, 47, 98, 98);
  // アバターの外枠は暗くせず、内枠（アバターの下地）だけを少し暗くする
  ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
  ctx.fillRect(15, 52, 88, 88);

  if (avatarImage) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(15, 52, 88, 88);
    ctx.clip();
    // 正方形にカバーフィット
    const s = Math.max(88 / avatarImage.width, 88 / avatarImage.height);
    const dw = avatarImage.width * s;
    const dh = avatarImage.height * s;
    ctx.drawImage(avatarImage, 15 + (88 - dw) / 2, 52 + (88 - dh) / 2, dw, dh);
    ctx.restore();
  } else {
    ctx.fillStyle = "#b9c5cf";
    ctx.beginPath();
    ctx.rect(15, 52, 88, 88);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 38px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText((name || "?").slice(0, 1), 59, 109);
    ctx.textAlign = "left";
  }

  // ===== チーム名バー（300x42） =====
  const teamBar = await assetImage(`team_bg_${data.teamColor}_mini.png`);
  ctx.drawImage(teamBar, 114, 4, 300, 42);
  const teamName = data.teamName ?? DEFAULT_TEAM_NAME;
  // 公式CSS .player_team_name: 白・太字
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#ffffff";
  fitFont(ctx, teamName, 246, 13, 10);
  ctx.fillText(teamName, 164, 30);
  ctx.restore();

  // ===== 称号バー（最大3つ、文字があるスロットだけ描く） =====
  const HONOR_LAYOUTS = [
    { bgX: 122, bgY: 45, centerX: 263, baseline: 66 },
    { bgX: 122, bgY: 79, centerX: 263, baseline: 100 },
    { bgX: 122, bgY: 113, centerX: 263, baseline: 135 }
  ];
  const honors = normalizeHonors(data);
  for (let i = 0; i < HONOR_LAYOUTS.length; i++) {
    const slot = honors[i];
    if (!slot?.text) continue;
    const layout = HONOR_LAYOUTS[i];
    const honorBg = await assetImage(`honor_bg_${slot.color}.png`);
    ctx.drawImage(honorBg, layout.bgX, layout.bgY, 285, 32);
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.textAlign = "center";
    fitFont(ctx, slot.text, 268, 15, 10);
    ctx.fillText(slot.text, layout.centerX, layout.baseline);
    ctx.restore();
  }

  // ===== プレイヤー名（公式CSS .player_name_in: 20px太字・黒、中央寄せ） =====
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  fitFont(ctx, name, 165, 20, 12);
  ctx.fillText(name, 256, 177);
  ctx.restore();

  // ===== クラスエンブレム（土台＋メダルを重ねて表示） =====
  if (data.classEmblem) {
    const emblemBase = await assetImage(`classemblem_base_0${data.classEmblem}.png`);
    const emblemMedal = await assetImage(`classemblem_medal_0${data.classEmblem}.png`);
    ctx.drawImage(emblemBase, 342, 155, 58, 28.13);
    ctx.drawImage(emblemMedal, 342, 155, 58, 28.13);
  }

  // ===== 星（リボーン）とレベル =====
  if (star >= 1) {
    const starImg = await assetImage("icon_reborn_star.png");
    ctx.drawImage(starImg, 122, 146, 22, 21);
    ctx.save();
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.fillText(String(star), 133, 161);
    ctx.restore();
  }
  ctx.fillStyle = "#222222";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(String(level), 147, 177);

  // ===== BATTLE RANK バッジ（公式画像。無いランクはプレート描画で代替） =====
  const rank = data.battleRank || "C3";
  const rankFile = rankImageFile(rank);
  if (rankFile) {
    const rankImg = await assetImage(rankFile);
    ctx.drawImage(rankImg, 17, 202, 90, 68);
  } else {
    const plate = rankPlate(rank);
    ctx.save();
    roundedRectPath(ctx, 17, 202, 90, 68, 6);
    ctx.clip();
    const grad = ctx.createLinearGradient(17, 202, 17, 270);
    for (const [pos, color] of plate.stops) grad.addColorStop(pos, color);
    ctx.fillStyle = grad;
    ctx.fillRect(17, 202, 90, 68);
    ctx.restore();
    ctx.strokeStyle = plate.border ?? "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 2;
    roundedRectPath(ctx, 17, 202, 90, 68, 6);
    ctx.stroke();
    // 文字（長いランク名はバッジ幅に合わせて縮小）
    let rankFontSize = 27;
    ctx.font = `bold ${rankFontSize}px ${FONT}`;
    while (ctx.measureText(rank).width > 80 && rankFontSize > 10) {
      rankFontSize -= 1;
      ctx.font = `bold ${rankFontSize}px ${FONT}`;
    }
    ctx.fillStyle = plate.text;
    ctx.textAlign = "center";
    ctx.fillText(rank, 62, 236 + rankFontSize * 0.35);
    ctx.textAlign = "left";
  }

  // ===== RATING（公式CSS .player_rating_num_block: 数字画像は高さ17px、間隔2px） =====
  const rating = data.rating ?? 0;
  const ratingMax = data.ratingMax ?? rating;
  const colorKey = ratingColorKey(rating);
  let rx = 225;
  const digitH = 17;
  const digitY = 190;
  for (const ch of rating.toFixed(2)) {
    if (ch === ".") {
      ctx.fillStyle = "#333333";
      ctx.beginPath();
      ctx.arc(rx + 2.5, digitY + 14.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      rx += 7;
    } else {
      const digit = await assetImage(`rating/rating_${colorKey}_0${ch}.png`);
      const dw = digit.width * (digitH / digit.height);
      ctx.drawImage(digit, rx, digitY, dw, digitH);
      rx += dw + 2;
    }
  }
  // MAX は固定位置に太字で表示
  ctx.fillStyle = "#222222";
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`(MAX ${ratingMax.toFixed(2)})`, 311, 203);

  // ===== OVER POWER（12px太字、カウンタから自動計算し達成率を常時表示） =====
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillStyle = "#222222";
  const op = overPowerOf(data);
  const opText = op.value.toFixed(2);
  const opSuffix = ` (${op.percent.toFixed(2)}%)`;
  ctx.fillText(opText + opSuffix, 227, 229);

  // ===== 最終プレイ（12px太字） =====
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillStyle = "#222222";
  ctx.fillText(formatLastPlay(data.lastAt), 227, 252);

  return canvas.toBuffer("image/png");
}
