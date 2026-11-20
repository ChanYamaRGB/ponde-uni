// カスタムプロフィールカード用のデータ保存。
// uni-score と同じDBチャンネルに、kind:"profile" のJSONメッセージとして
// 1ユーザー1件で保存する。uni-score のレコードは {id, points, usable} で、
// こちらはトップレベルに id を持たないため、uni-score 側の集計には混ざらない。
const DB_CHANNEL_ID = "1463094897174380587";

// メッセージが投稿されるたびに編集するとAPI呼び出しが多くなるため、
// 保存は間引く。ただし星（リボーン）の数が変わるタイミングでは即時保存する。
const SAVE_THROTTLE_MS = 15 * 1000;

export const DEFAULT_TEAM_NAME = "ぽん・で・りんぐ";

// 称号は最大3つまで付けられる（CHUNITHM-NET のプロフィール仕様）
export const MAX_HONORS = 3;

const HONOR_COLOR_KEYS = [
  "rainbow", "platina", "gold", "silver", "copper", "normal", "none",
  "expert", "master", "ultima", "maimai", "ongeki", "staff",
  "phoenix_g", "phoenix_p", "phoenix_r"
];

function defaultHonors() {
  return [
    { text: null, color: "gold" },
    { text: null, color: "normal" },
    { text: null, color: "normal" }
  ];
}

// 称号スロットを3つに揃える。旧形式（honorText / honorColor）があれば
// 1つ目のスロットへ移し、旧キーは取り除く。
export function normalizeHonors(data) {
  let source = null;
  if (Array.isArray(data.honors)) {
    source = data.honors;
  } else if (data.honorText != null || data.honorColor != null) {
    source = [{ text: data.honorText ?? null, color: data.honorColor ?? "gold" }];
  }
  const defaults = defaultHonors();
  const honors = defaults.map((fallback, i) => {
    const slot = source?.[i];
    if (!slot || typeof slot !== "object") return fallback;
    return {
      text: typeof slot.text === "string" && slot.text !== "" ? slot.text : null,
      color: HONOR_COLOR_KEYS.includes(slot.color) ? slot.color : fallback.color
    };
  });
  delete data.honorText;
  delete data.honorColor;
  return honors;
}

export function createDefaultProfile(userId) {
  return {
    kind: "profile",
    userId,
    name: null,               // null の場合はサーバーでの表示名を使う
    honors: defaultHonors(),  // 称号（最大3つ）: { text, color } の配列
    teamName: null,           // null の場合は DEFAULT_TEAM_NAME
    teamColor: "gold",        // チームの色（team_bg_mini のバリアント名）
    charaBg: "normal",   // キャラクター背景（bg_chara のバリアント名）
    background: "normal",    // プロフィール全体の背景（profile のバリアント名）
    battleRank: "C3",
    classEmblem: null,        // クラスエンブレム（1〜6、null は非表示）
    avatar: null,             // キャラクターアバター（"<page>/<id>"、null は Discord のアバター）
    rating: 0,
    ratingMax: null,          // null の場合は rating と同じ値を表示
    msgCount: 0,              // 投稿数 = レベルの元になる値
    lastAt: 0,                // 最終投稿時刻（epoch ミリ秒）
    // OVER POWER の集計用カウンタ（overPowerOf で換算する。導入時からの累計）
    textPosts: 0,             // メッセージ投稿数（画像の添付なし）
    imagePosts: 0,            // 画像投稿数（本文があっても画像を優先）
    emojiUses: 0,             // サーバーのカスタム絵文字の使用回数（メッセージ本文のみ）
    activeDays: 0,            // 活動日数（JST の日付単位）
    lastActiveDate: null,     // 最後に活動した日（JST、"YYYY-MM-DD"）
    lastDayPosts: 0,          // lastActiveDate に数えた投稿数（削除時の日数の差し引き用）
    opSince: null,            // OVER POWER 集計を開始した時刻（これより前の投稿は差し引き対象外）
    reactionsGiven: 0,        // サーバーのカスタム絵文字で他の人の投稿にリアクションした回数
    reactionsReceived: 0      // 他のユーザーからサーバーのカスタム絵文字でリアクションされた回数
  };
}

// レベル表示への変換。次のレベルへ上がるには「次のレベルの数」と同じ投稿数が
// 必要（Lv.1 には1投稿、Lv.2 にはさらに2投稿、Lv.3 にはさらに3投稿…）。
// Lv.100 到達分の累計 5,050 投稿（1+2+…+100）ごとに星が1つ増え、レベルは0に戻る。
export function levelOf(msgCount) {
  const POSTS_PER_STAR = 5050; // 1+2+...+100
  const cycle = msgCount % POSTS_PER_STAR;
  const level = Math.floor((Math.sqrt(1 + 8 * cycle) - 1) / 2);
  return {
    level,
    star: Math.floor(msgCount / POSTS_PER_STAR)
  };
}

// OVER POWER の達成項目と段階表（[しきい値, 達成値]。しきい値以上でその達成値になる）。
// 本家と同じく「項目ごとの達成値の合計」で、上限は全項目の満点の合計とする。
const OP_TIERS = {
  textPosts:  { max: 18000, tiers: [[50, 1500], [150, 4000], [300, 7000], [500, 10500], [800, 14000], [1200, 18000]] },
  imagePosts: { max: 22000, tiers: [[20, 2000], [50, 5000], [100, 9000], [200, 13000], [350, 17000], [500, 22000]] },
  activeDays: { max: 20000, tiers: [[7, 3000], [30, 8000], [90, 13000], [180, 17000], [365, 20000]] },
  emojiUses:  { max: 20000, tiers: [[50, 2500], [150, 6000], [300, 10000], [600, 14000], [1000, 20000]] },
  reactionsGiven:    { max: 15000, tiers: [[25, 1500], [75, 4000], [150, 7000], [300, 10500], [500, 15000]] },
  reactionsReceived: { max: 18000, tiers: [[25, 2000], [75, 5000], [150, 8500], [300, 13000], [500, 18000]] }
};
export const OVER_POWER_MAX = Object.values(OP_TIERS).reduce((sum, t) => sum + t.max, 0);

function tierValue(tiers, count) {
  let value = 0;
  for (const [threshold, v] of tiers) {
    if (count >= threshold) value = v;
  }
  return value;
}

// OVER POWER をカウンタから計算する（保存はせず、描画時に毎回計算する）
export function overPowerOf(data) {
  const value =
    tierValue(OP_TIERS.textPosts.tiers, data.textPosts ?? 0) +
    tierValue(OP_TIERS.imagePosts.tiers, data.imagePosts ?? 0) +
    tierValue(OP_TIERS.activeDays.tiers, data.activeDays ?? 0) +
    tierValue(OP_TIERS.emojiUses.tiers, data.emojiUses ?? 0) +
    tierValue(OP_TIERS.reactionsGiven.tiers, data.reactionsGiven ?? 0) +
    tierValue(OP_TIERS.reactionsReceived.tiers, data.reactionsReceived ?? 0);
  return { value, max: OVER_POWER_MAX, percent: (value / OVER_POWER_MAX) * 100 };
}

// 投稿のあった日（JST）を "YYYY-MM-DD" で返す
function jstDateString(timestamp) {
  return new Date(timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".avif"];

// 画像の添付があるか（本文が含まれていても画像投稿を優先する）
function hasImageAttachment(message) {
  const attachments = message.attachments;
  if (!attachments) return false;
  const list = typeof attachments.values === "function" ? [...attachments.values()] : [...attachments];
  return list.some((a) => {
    if ((a.contentType ?? "").startsWith("image/")) return true;
    const name = (a.name ?? "").toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
  });
}

// メッセージ本文で使われた、そのサーバーのカスタム絵文字の回数を数える。
// リアクションでの使用や、他のサーバーの絵文字・通常の絵文字は対象外。
function countGuildEmojiUses(message) {
  const content = message.content ?? "";
  const emojis = message.guild?.emojis?.cache;
  if (!content || !emojis) return 0;
  let count = 0;
  for (const match of content.matchAll(/<a?:[A-Za-z0-9_]+:(\d+)>/g)) {
    if (emojis.has(match[1])) count += 1;
  }
  return count;
}

let dbChannel = null;
let loadPromise = null;
const cache = new Map(); // userId -> { message, data, lastSavedAt }

function parseData(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadAll(client) {
  dbChannel = await client.channels.fetch(DB_CHANNEL_ID);
  if (!dbChannel || !dbChannel.isTextBased()) {
    throw new Error("プロフィール用DBチャンネルが見つかりません");
  }

  // uni-score と同じく、古い方へ辿って全件取得する
  let before;
  while (true) {
    const options = { limit: 100 };
    if (before) options.before = before;

    const messages = await dbChannel.messages.fetch(options);
    if (messages.size === 0) break;

    for (const msg of messages.values()) {
      if (!msg.author.bot) continue;
      const parsed = parseData(msg.content);
      if (parsed && parsed.kind === "profile" && parsed.userId) {
        if (!cache.has(parsed.userId)) {
          const data = { ...createDefaultProfile(parsed.userId), ...parsed };
          data.honors = normalizeHonors(data);
          cache.set(parsed.userId, {
            message: msg,
            data,
            lastSavedAt: 0
          });
        }
      }
    }

    if (messages.size < 100) break;
    const lastId = messages.last()?.id;
    if (!lastId || lastId === before) break;
    before = lastId;
  }
}

export async function ensureProfileStore(client) {
  if (!loadPromise) {
    loadPromise = loadAll(client).catch((err) => {
      // 読み込みに失敗したら次回リトライできるようにする
      loadPromise = null;
      throw err;
    });
  }
  return loadPromise;
}

async function saveEntry(entry) {
  await entry.message.edit(JSON.stringify(entry.data));
  entry.lastSavedAt = Date.now();
}

// プロフィールを取得する。無ければDBチャンネルに新規作成する。
export async function getProfile(client, userId) {
  await ensureProfileStore(client);

  let entry = cache.get(userId);
  if (!entry) {
    const data = createDefaultProfile(userId);
    const message = await dbChannel.send(JSON.stringify(data));
    entry = { message, data, lastSavedAt: Date.now() };
    cache.set(userId, entry);
  }
  return entry.data;
}

// プロフィールを更新して即時保存する（カスタム項目の変更用）。
export async function updateProfile(client, userId, patch) {
  const data = await getProfile(client, userId);
  Object.assign(data, patch);
  const entry = cache.get(userId);
  await saveEntry(entry);
  return data;
}

// プロフィールのカスタマイズ設定を初期状態に戻して即時保存する（管理者によるリセット用）。
// 活動データ（投稿数・最終投稿時刻・OVER POWER 集計用カウンタ）は保持する。
export async function resetProfile(client, userId) {
  const data = await getProfile(client, userId);
  const kept = {};
  for (const key of ["msgCount", "lastAt", "textPosts", "imagePosts", "emojiUses", "activeDays", "lastActiveDate", "lastDayPosts", "opSince", "reactionsGiven", "reactionsReceived"]) {
    kept[key] = data[key];
  }
  Object.assign(data, createDefaultProfile(userId));
  Object.assign(data, kept);
  const entry = cache.get(userId);
  await saveEntry(entry);
  return data;
}

// メッセージ投稿の記録（レベルと最終プレイ用）。
// messageCreate ハンドラから全メッセージについて呼ばれる想定で、
// 失敗しても呼び出し側の処理を止めないよう、例外は内部で握る。
export async function trackMessage(message) {
  try {
    if (!message.guild || message.author.bot) return;

    const client = message.client;
    await ensureProfileStore(client);

    const userId = message.author.id;
    let entry = cache.get(userId);
    if (!entry) {
      await getProfile(client, userId);
      entry = cache.get(userId);
    }

    const prevStar = levelOf(entry.data.msgCount).star;
    entry.data.msgCount += 1;
    entry.data.lastAt = message.createdTimestamp;

    // OVER POWER 用の集計（カウンタは導入時からの累計。開始時刻を記録しておき、
    // 削除時の差し引きは集計開始以降の投稿だけを対象にする）
    const d = entry.data;
    if (d.opSince == null) d.opSince = message.createdTimestamp;
    if (hasImageAttachment(message)) d.imagePosts = (d.imagePosts ?? 0) + 1;
    else d.textPosts = (d.textPosts ?? 0) + 1;
    d.emojiUses = (d.emojiUses ?? 0) + countGuildEmojiUses(message);
    const today = jstDateString(message.createdTimestamp);
    if (d.lastActiveDate !== today || (d.lastDayPosts ?? 0) === 0) {
      d.activeDays = (d.activeDays ?? 0) + 1;
      d.lastActiveDate = today;
      d.lastDayPosts = 1;
    } else {
      d.lastDayPosts = (d.lastDayPosts ?? 0) + 1;
    }

    const newStar = levelOf(entry.data.msgCount).star;

    if (newStar !== prevStar || Date.now() - entry.lastSavedAt >= SAVE_THROTTLE_MS) {
      await saveEntry(entry);
    }
  } catch (err) {
    console.error("[PROFILE] 活動記録に失敗しました:", err);
  }
}

// 投稿が削除されたときに、OVER POWER の集計からその投稿分を差し引く。
// レベル用の投稿数（msgCount）には影響させない。
// messageDelete ハンドラから呼ばれ、例外は内部で握る。
export async function untrackMessage(message) {
  try {
    // 内容を確認できない（キャッシュにない）投稿は対象外
    if (!message.guild || message.partial || !message.author || message.author.bot) return;

    const client = message.client;
    await ensureProfileStore(client);

    const entry = cache.get(message.author.id);
    if (!entry) return;

    const d = entry.data;
    // 集計を開始する前の投稿は数えていないため、差し引きの対象外
    if (d.opSince == null || message.createdTimestamp < d.opSince) return;

    if (hasImageAttachment(message)) d.imagePosts = Math.max(0, (d.imagePosts ?? 0) - 1);
    else d.textPosts = Math.max(0, (d.textPosts ?? 0) - 1);
    d.emojiUses = Math.max(0, (d.emojiUses ?? 0) - countGuildEmojiUses(message));

    // 直近の活動日については、その日の投稿が0件になったら活動日数も差し引く
    const day = jstDateString(message.createdTimestamp);
    if (d.lastActiveDate === day && (d.lastDayPosts ?? 0) > 0) {
      d.lastDayPosts -= 1;
      if (d.lastDayPosts === 0) {
        d.activeDays = Math.max(0, (d.activeDays ?? 0) - 1);
      }
    }

    await saveEntry(entry);
  } catch (err) {
    console.error("[PROFILE] 削除時の差し引きに失敗しました:", err);
  }
}

// リアクションの付け外しを OVER POWER の集計へ反映する共通処理（delta は +1 / -1）。
// した側・された側とも、そのサーバーのカスタム絵文字によるリアクションだけを数える。
// 自分の投稿へのリアクションは、した側・された側のどちらも対象外。
// Bot の投稿・Bot によるリアクションは対象外。
async function applyReaction(reaction, user, delta) {
  const message = reaction?.message;
  if (!message?.guild || !message.author || message.author.bot) return;
  if (!user || user.bot || user.partial || reaction.partial || message.partial) return;
  if (user.id === message.author.id) return;

  const emojiId = reaction.emoji?.id;
  if (!emojiId || !message.guild.emojis.cache.has(emojiId)) return;

  const client = message.client;
  await ensureProfileStore(client);

  const bump = async (userId, key) => {
    await getProfile(client, userId);
    const entry = cache.get(userId);
    if (!entry) return;
    entry.data[key] = Math.max(0, (entry.data[key] ?? 0) + delta);
    // 取り消し（delta < 0）は即時保存し、追加は間引いて保存する
    if (delta < 0 || Date.now() - entry.lastSavedAt >= SAVE_THROTTLE_MS) {
      await saveEntry(entry);
    }
  };

  await bump(message.author.id, "reactionsReceived");
  await bump(user.id, "reactionsGiven");
}

// リアクションが付けられたときの記録。messageReactionAdd ハンドラから呼ばれ、例外は内部で握る。
export async function trackReactionAdd(reaction, user) {
  try {
    await applyReaction(reaction, user, +1);
  } catch (err) {
    console.error("[PROFILE] リアクションの記録に失敗しました:", err);
  }
}

// リアクションが外されたときの差し引き。messageReactionRemove ハンドラから呼ばれ、例外は内部で握る。
export async function trackReactionRemove(reaction, user) {
  try {
    await applyReaction(reaction, user, -1);
  } catch (err) {
    console.error("[PROFILE] リアクションの差し引きに失敗しました:", err);
  }
}
