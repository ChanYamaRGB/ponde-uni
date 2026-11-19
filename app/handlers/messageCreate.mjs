import aa from './messageCreate/aa.mjs';
import songsData from '../utils/DB/highDifficulty.mjs';
import { trackMessage } from '../utils/profile-store.mjs';

const allSongs = Object.values(songsData).flat();
const activeSessions = new Map();

// ▼ 新しく作る「スタンプID取得用チャンネル」のIDをここに入力 ▼
const STICKER_LOG_CHANNEL_ID = '1558826186145275926';

// ▼ 機能用のID ▼
const TARGET_CHANNEL_ID = '1185543219241562172';
const START_STICKER_ID = '1229639647861411922';
const STOP_STICKER_ID = '1231291282324721684';

// 楽曲ループのセッションはユーザーごとに独立して管理する。
// 停止処理は「そのセッション自身」であることを確認してから行い、
// 再開始した後の新しいセッションを巻き込んで止めないようにする。
function stopSession(userId, session) {
  if (activeSessions.get(userId) !== session) return;
  clearInterval(session.interval);
  clearTimeout(session.timeout);
  activeSessions.delete(userId);
}

function startSession(message) {
  const userId = message.author.id;
  const channel = message.channel;

  const existing = activeSessions.get(userId);
  if (existing) {
    clearInterval(existing.interval);
    clearTimeout(existing.timeout);
    activeSessions.delete(userId);
  }

  const session = { interval: null, timeout: null };
  session.interval = setInterval(async () => {
    try {
      const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
      // 開始メッセージへの返信ではなく、チャンネルへメンション付きで送る。
      // 開始メッセージが削除されても送信が失敗しないようにするため。
      await channel.send(`<@${userId}> ${randomSong}`);
    } catch (err) {
      // 送信に失敗した場合は、このユーザーのセッションだけを止める。
      console.error("楽曲ループ送信に失敗しました:", err);
      stopSession(userId, session);
    }
  }, 20 * 60 * 1000);
  session.timeout = setTimeout(() => {
    stopSession(userId, session);
  }, 3 * 60 * 60 * 1000);

  activeSessions.set(userId, session);
}

export default async function(message) {
  // プロフィールカード用の活動記録（レベル・最終プレイ）。
  // trackMessage 内で例外は握っているため、他の処理には影響しない。
  await trackMessage(message);

  await aa(message);
  if (message.author.bot) return;

  // ==========================================
  // 1. スタンプID取得用チャンネルの処理
  // ==========================================
  if (message.channel.id === STICKER_LOG_CHANNEL_ID) {
    if (message.stickers.size > 0) {
      const stickerId = message.stickers.first().id;
      const stickerName = message.stickers.first().name;
      
      await message.reply(`スタンプ「${stickerName}」のID:\n\`${stickerId}\``);
    }
    return; // 取得用チャンネルでの処理はここで終了
  }

  // ==========================================
  // 2. 楽曲ループ送信機能の処理
  // ==========================================
  if (message.channel.id === TARGET_CHANNEL_ID) {
    if (message.stickers.size > 0) {
      const stickerId = message.stickers.first().id;

      // --- 開始スタンプ ---
      if (stickerId === START_STICKER_ID) {
        startSession(message);
      }

      // --- 停止スタンプ ---
      else if (stickerId === STOP_STICKER_ID) {
        const session = activeSessions.get(message.author.id);
        if (session) {
          stopSession(message.author.id, session);
        }
      }
    }
  }

  // 他のメッセージ処理がある場合はこの下に追加
}
