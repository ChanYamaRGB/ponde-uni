import aa from './messageCreate/aa.mjs';
import songsData from '../utils/DB/songs.mjs';

const allSongs = Object.values(songsData).flat();
const activeSessions = new Map();

// ▼ 新しく作る「スタンプID取得用チャンネル」のIDをここに入力 ▼
const STICKER_LOG_CHANNEL_ID = '1558826186145275926';

// ▼ 機能用のID ▼
const TARGET_CHANNEL_ID = '1185543219241562172';
const START_STICKER_ID = '1229639647861411922';
const STOP_STICKER_ID = '1231291282324721684';

export default async function(message) {
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
        if (activeSessions.has(message.author.id)) {
          const existing = activeSessions.get(message.author.id);
          clearInterval(existing.interval);
          clearTimeout(existing.timeout);
        }

        const intervalId = setInterval(() => {
          const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
          message.reply(`${randomSong}`);
        }, 5 * 60 * 1000);

        const timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          activeSessions.delete(message.author.id);
        }, 3 * 60 * 60 * 1000);

        activeSessions.set(message.author.id, { interval: intervalId, timeout: timeoutId });
      }

      // --- 停止スタンプ ---
      else if (stickerId === STOP_STICKER_ID) {
        if (activeSessions.has(message.author.id)) {
          const session = activeSessions.get(message.author.id);
          clearInterval(session.interval);
          clearTimeout(session.timeout);
          activeSessions.delete(message.author.id);
        }
      }
    }
  }

  // 他のメッセージ処理がある場合はこの下に追加
}
