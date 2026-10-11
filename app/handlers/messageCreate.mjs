import aa from './messageCreate/aa.mjs';
import songsData from '../utils/DB/songs.mjs';

const allSongs = Object.values(songsData).flat();
const activeSessions = new Map();

// ▼ 新しく作る「スタンプID取得用チャンネル」のIDをここに入力 ▼
const STICKER_LOG_CHANNEL_ID = '1558826186145275926';

// ▼ 機能用のID ▼
const TARGET_CHANNEL_ID = '1451463871922573343';
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
      console.log(message.stickers.first().id);
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
          message.channel.send({
            content: `<@${message.author.id}> 🎵 ランダム楽曲: **${randomSong}**`
          });
        }, 10 * 60 * 1000);

        const timeoutId = setTimeout(() => {
          clearInterval(intervalId);
          activeSessions.delete(message.author.id);
          message.channel.send({
            content: `<@${message.author.id}> ⏱️ 3時間が経過したため、楽曲の自動送信を停止しました。`
          });
        }, 3 * 60 * 60 * 1000);

        activeSessions.set(message.author.id, { interval: intervalId, timeout: timeoutId });
        await message.reply('▶️ 10分おきのランダム楽曲送信を開始しました！（3時間経過、または停止スタンプで終了します）');
      }

      // --- 停止スタンプ ---
      else if (stickerId === STOP_STICKER_ID) {
        if (activeSessions.has(message.author.id)) {
          const session = activeSessions.get(message.author.id);
          clearInterval(session.interval);
          clearTimeout(session.timeout);
          activeSessions.delete(message.author.id);

          await message.reply('⏹️ 楽曲の自動送信を停止しました。');
        }
      }
    }
  }

  // 他のメッセージ処理がある場合はこの下に追加
}
