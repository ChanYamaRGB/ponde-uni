import fs from 'fs/promises'; 
import path from 'path'; 
import { fileURLToPath } from 'url'; 
import channelNamePools from './DB/songs.mjs'; 
 
let hasScheduled = false; 
 
const __dirname = path.dirname(fileURLToPath(import.meta.url)); 
const logFilePath = path.join(__dirname, './DB/song-update-log.json'); 

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

async function readLastUpdateDate() { 
  try { 
    const data = await fs.readFile(logFilePath, 'utf-8'); 
    const { lastUpdatedDate } = JSON.parse(data); 
    return lastUpdatedDate; 
  } catch (e) { 
    console.log("ログファイル読み込み失敗または未作成:", e.message);
    return null; 
  } 
} 
 
async function writeLastUpdateDate(dateStr) {
  try {
    const data = { lastUpdatedDate: dateStr };
    await fs.writeFile(logFilePath, JSON.stringify(data), 'utf-8');

    // 🔍 書き込み確認のために読み直す
    const confirm = JSON.parse(await fs.readFile(logFilePath, 'utf-8'));
    console.log("✅ 確認：ログファイル内容 =", confirm);
  } catch(e) {
    console.error("❌ ログファイル書き込みエラー:", e);
  }
}

 
export default function song_update(client, isManual = false) { 
  const targetChannelId = "1380956236454953063"; 
 
  if (!isManual && hasScheduled) return; 
  if (!isManual) hasScheduled = true; 
 
  const renameChannel = async () => { 
    const todayStr = new Date().toISOString().slice(0,10); 
    const lastUpdated = await readLastUpdateDate(); 
 
    if (lastUpdated === todayStr) { 
      console.log(`${isManual ? "手動" : "自動"}更新スキップ：すでに ${todayStr} に更新済みです`); 
      return; 
    } 
 
    try { 
      const now = new Date(); 
      const day = now.getDay(); 
      const pool = channelNamePools[day]; 
 
      if (!Array.isArray(pool) || pool.length === 0) { 
        console.warn(`曜日 ${weekdays[day]} に対応する曲候補が songs.mjs に見つかりません`); 
        return; 
      } 
 
      const index = Math.floor(Math.random() * pool.length); 
      const newName = pool[index]; 
 
      const channel = await client.channels.fetch(targetChannelId); 
      if (!channel || channel.type !== 2) { 
        console.error('指定したチャンネルが見つからないか、ボイスチャンネルではありません'); 
        return; 
      } 
 
      await channel.setName(newName); 
      await writeLastUpdateDate(todayStr); 
      console.log(`(${weekdays[day]}曜) チャンネル名を「${newName}」に変更しました`); 
    } catch (err) { 
      console.error('チャンネル名の変更中にエラー:', err); 
    } 
  }; 
 
  const scheduleDailyRename = () => { 
    const now = new Date(); 
    const nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0); 
    if (nextTime < now) nextTime.setDate(nextTime.getDate() + 1); 
 
    const delay = nextTime - now; 
    console.log(`次のオススメ曲の更新は: ${nextTime.toLocaleString()} に予定されています`); 
 
    setTimeout(() => { 
      renameChannel(); 
      scheduleDailyRename(); 
    }, delay); 
  }; 
 
  renameChannel(); 
  scheduleDailyRename(); 
} 
