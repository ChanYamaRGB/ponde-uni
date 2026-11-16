import channelNamePools from './DB/songs.mjs';

// ============================================================
// 日替わりボイスチャンネル名（曲名）の更新
//
// 日付から決定的に曲を選ぶ（保存なし）
// 曲は「その日の日付（JST）」を種にして選ぶため、同じ日付では
// 何度計算しても必ず同じ曲になります。Botを再起動しても、
// 別の環境にデプロイし直しても、その日の曲は変わりません。
// そのため、以前のような「チャンネルの概要欄（トピック）に
// 更新日と曲名を保存しておく」仕組みは不要になりました。
// ログ用チャンネル（旧 logChannelId）ももう使いません。
//
// 日本時間（JST = UTC+9、夏時間なし）で固定計算します。
// サーバーのタイムゾーン設定（Koyeb等は通常UTC）に左右されません。
// ============================================================

const targetChannelId = "1380956236454953063"; // ボイスチャンネルID

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

let hasScheduled = false;

// 現在時刻（ミリ秒）をJSTの壁時計として扱える形にずらした Date を返す。
// この Date は getUTC* 系で読むこと（getUTC* の値がそのままJSTの年月日時分秒になる）。
export function getJstDate(nowMs = Date.now()) {
return new Date(nowMs + JST_OFFSET_MS);
}

// JSTでの「YYYY-MM-DD」と曜日（0=日〜6=土）を返す
export function getJstDateParts(nowMs = Date.now()) {
const jst = getJstDate(nowMs);
const year = jst.getUTCFullYear();
const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
const day = String(jst.getUTCDate()).padStart(2, "0");
return {
dateStr: `${year}-${month}-${day}`,
weekday: jst.getUTCDay(),
};
}

// 文字列のハッシュ（FNV-1a 32bit）。日付文字列の種に使う。
function hashString(str) {
let hash = 0x811c9dc5;
for (let i = 0; i < str.length; i++) {
hash ^= str.charCodeAt(i);
hash = Math.imul(hash, 0x01000193);
}
return hash >>> 0;
}

// その日の曲を決定的に選ぶ。同じ dateStr と pool では必ず同じ曲を返す。
export function pickDailySong(dateStr, pool) {
if (!Array.isArray(pool) || pool.length === 0) return null;
const index = hashString(dateStr) % pool.length;
return pool[index];
}

// 次のJST 7:00 までのミリ秒を返す（過ぎていれば翌日の7:00）。
export function msUntilNext7amJst(nowMs = Date.now()) {
const jst = getJstDate(nowMs);
let next = Date.UTC(
jst.getUTCFullYear(),
jst.getUTCMonth(),
jst.getUTCDate(),
7, 0, 0
);
if (next <= jst.getTime()) {
next += DAY_MS;
}
return next - jst.getTime();
}

export default function song_update(client, isManual = false) {
const renameChannel = async () => {
const { dateStr, weekday} = getJstDateParts();

const pool = channelNamePools[weekday];
if (!Array.isArray(pool) || pool.length === 0) {
console.warn(`⚠️ ${weekdays[weekday]}曜の曲リストが見つかりません`);
return;
}

const newName = pickDailySong(dateStr, pool);

try {
const channel = await client.channels.fetch(targetChannelId);
if (!channel || channel.type!== 2) {
console.error("❌ ボイスチャンネルが見つからないかタイプ不一致");
return;
}

// 既にその日の曲名になっていれば、変更APIを呼ばない
// （再起動時の「引き直し」に見える現象も、無駄なレート制限消費も防げます）
if (channel.name === newName) {
console.log(`⏭️ スキップ：${dateStr} の曲は既に「${newName}」です`);
return;
}

await channel.setName(newName);
console.log(`🎶 チャンネル名を「${newName}」（${dateStr} / ${weekdays[weekday]}曜）に変更しました`);
} catch (err) {
console.error("💥 チャンネル名の変更中にエラー:", err);
}
};

const scheduleDailyRename = () => {
const delay = msUntilNext7amJst();
const nextJst = getJstDate(Date.now() + delay);
console.log(`⏰ 次の更新予定: ${nextJst.toUTCString().replace("GMT", "JST")}`);

setTimeout(() => {
renameChannel();
scheduleDailyRename();
}, delay);
};

// 起動時にその日の曲へ合わせる（何度起動しても結果は同じ）
renameChannel();

// 日次スケジュールはプロセス内で1回だけ張る
if (!hasScheduled) {
hasScheduled = true;
scheduleDailyRename();
}
}
