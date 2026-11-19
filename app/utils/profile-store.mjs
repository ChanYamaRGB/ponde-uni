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
    charaBg: "holographic",   // キャラクター背景（bg_chara のバリアント名）
    background: "rainbow",    // プロフィール全体の背景（profile のバリアント名）
    battleRank: "C3",
    classEmblem: null,        // クラスエンブレム（1〜6、null は非表示）
    rating: 0,
    ratingMax: null,          // null の場合は rating と同じ値を表示
    overPower: 0,
    overPowerPercent: null,   // null の場合は (%) を表示しない
    msgCount: 0,              // 投稿数 = レベルの元になる値
    lastAt: 0                 // 最終投稿時刻（epoch ミリ秒）
  };
}

// レベル表示への変換。100投稿ごとに星が1つ増え、レベルは0に戻る。
export function levelOf(msgCount) {
  return {
    level: msgCount % 100,
    star: Math.floor(msgCount / 100)
  };
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
    const newStar = levelOf(entry.data.msgCount).star;

    if (newStar !== prevStar || Date.now() - entry.lastSavedAt >= SAVE_THROTTLE_MS) {
      await saveEntry(entry);
    }
  } catch (err) {
    console.error("[PROFILE] 活動記録に失敗しました:", err);
  }
}
