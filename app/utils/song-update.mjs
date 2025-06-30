import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import channelNamePools from './DB/songs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logFilePath = path.join(__dirname, './DB/song-update-log.json');
const schedulePath = path.join(__dirname, './DB/monthly-schedule.json');

let hasScheduled = false;

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

async function readLastUpdateDate() {
  try {
    await fs.access(logFilePath);
    const data = await fs.readFile(logFilePath, 'utf-8');
    const { lastUpdatedDate } = JSON.parse(data);
    return lastUpdatedDate;
  } catch {
    return null;
  }
}

async function writeLastUpdateDate(dateStr) {
  await fs.mkdir(path.dirname(logFilePath), { recursive: true });
  await fs.writeFile(logFilePath, JSON.stringify({ lastUpdatedDate: dateStr }), 'utf-8');
}

function shuffle(array) {
  return array
    .map(v => [v, Math.random()])
    .sort((a, b) => a[1] - b[1])
    .map(v => v[0]);
}

async function getOrSetMonthlySchedule() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let schedule = {};
  try {
    const raw = await fs.readFile(schedulePath, 'utf-8');
    schedule = JSON.parse(raw);
  } catch {
    // 初回またはファイルなし
  }

  if (schedule[monthKey]) return schedule[monthKey];

  const original = [0, 1, 2, 3, 4, 5, 6];
  const shuffled = shuffle([...original]);

  const mapping = {};
  for (let i = 0; i < 7; i++) {
    mapping[i] = shuffled[i];
  }

  schedule[monthKey] = mapping;

  await fs.mkdir(path.dirname(schedulePath), { recursive: true });
  await fs.writeFile(schedulePath, JSON.stringify(schedule, null, 2), 'utf-8');

  console.log(`📅 ${monthKey} の曜日→内容の対応をシャッフルしました:`);
  Object.entries(mapping).forEach(([day, mapped]) => {
    console.log(`  ${weekdays[day]}曜 → ${weekdays[mapped]}曜の内容`);
  });

  return mapping;
}

export default function song_update(client) {
  const targetChannelId = "1380956236454953063"; // ← あなたのボイスチャンネルIDに置き換えてください

  if (hasScheduled) return;
  hasScheduled = true;

  const renameChannel = async () => {
    const now = new Date();
    const todayStr = now.toLocaleDateString("ja-JP");
    const todayWeekday = now.getDay();
    const lastUpdated = await readLastUpdateDate();

    if (lastUpdated === todayStr) {
      console.log(`✅ 既にオススメ曲は ${todayStr} に更新済みです`);
      return;
    }

    const monthlyMap = await getOrSetMonthlySchedule();
    const mappedWeekday = monthlyMap[todayWeekday];

    const pool = channelNamePools[mappedWeekday];
    if (!Array.isArray(pool) || pool.length === 0) {
      console.warn(`⚠️ ${weekdays[mappedWeekday]}曜の候補が songs.mjs に存在しません`);
      return;
    }

    const index = Math.floor(Math.random() * pool.length);
    const newName = pool[index];

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || channel.type !== 2) {
        console.error('❌ 指定したチャンネルが見つからないか、ボイスチャンネルではありません');
        return;
      }

      await channel.setName(newName);
      await writeLastUpdateDate(todayStr);

      console.log(`🎉（${weekdays[todayWeekday]}曜 → ${weekdays[mappedWeekday]}曜の内容）チャンネル名を「${newName}」に変更しました`);
    } catch (err) {
      console.error('💥 チャンネル名の変更中にエラー:', err);
    }
  };

  const scheduleDailyRename = () => {
    const now = new Date();
    const nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    if (nextTime < now) nextTime.setDate(nextTime.getDate() + 1);

    const delay = nextTime - now;
    console.log(`⏰ 次のオススメ曲更新は: ${nextTime.toLocaleString()} に予定されています`);

    setTimeout(() => {
      renameChannel();
      scheduleDailyRename();
    }, delay);
  };

  renameChannel();
  scheduleDailyRename();
}
