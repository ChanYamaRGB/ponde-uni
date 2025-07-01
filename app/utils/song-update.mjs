// utils/song-update.mjs

import channelNamePools from './DB/songs.mjs';

let hasScheduled = false;

const targetChannelId = "1380956236454953063";        // ✅ 対象のボイスチャンネル
const logChannelId    = "1389492960424624129";         // ✅ トピックを使う保存用のテキストチャンネル

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

// 保存チャンネルのトピックから最終更新日を取得
async function getLastUpdatedFromLogChannel(client) {
  try {
    const logChannel = await client.channels.fetch(logChannelId);
    if (!logChannel || logChannel.type !== 0) { // 0 = GUILD_TEXT
      console.error('❌ ログ保存用のチャンネルが見つからないか、テキストチャンネルではありません');
      return null;
    }

    const topic = logChannel.topic || "";
    const match = topic.match(/lastUpdated:\s*(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  } catch (err) {
    console.error("❌ トピックから最終更新日を取得できませんでした:", err);
    return null;
  }
}

// ログチャンネルのトピックに最終更新日を保存
async function setLastUpdatedInLogChannel(client, dateStr) {
  try {
    const logChannel = await client.channels.fetch(logChannelId);
    if (!logChannel || logChannel.type !== 0) {
      console.error('❌ ログ保存用のチャンネルが見つからないか、テキストチャンネルではありません');
      return;
    }

    await logChannel.setTopic(`lastUpdated: ${dateStr}`);
    console.log("✅ トピックに更新日を保存しました:", dateStr);
  } catch (err) {
    console.error("❌ トピックの更新に失敗しました:", err);
  }
}

export default function song_update(client, isManual = false) {
  if (!isManual && hasScheduled) return;
  if (!isManual) hasScheduled = true;

  const renameChannel = async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("ja-JP");
    const weekday = today.getDay();

    const lastUpdated = await getLastUpdatedFromLogChannel(client);
    if (lastUpdated === todayStr) {
      const tag = isManual ? "手動" : "自動";
      console.log(`⏭️ ${tag}更新スキップ：すでに ${todayStr} に更新済みです`);
      return;
    }

    try {
      const pool = channelNamePools[weekday];
      if (!Array.isArray(pool) || pool.length === 0) {
        console.warn(`⚠️ ${weekdays[weekday]}曜の曲候補が songs.mjs に見つかりません`);
        return;
      }

      const index = Math.floor(Math.random() * pool.length);
      const newName = pool[index];

      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || channel.type !== 2) {
        console.error('❌ 対象チャンネルが見つからないか、ボイスチャンネルではありません');
        return;
      }

      await channel.setName(newName);
      await setLastUpdatedInLogChannel(client, todayStr);

      console.log(`🎶（${weekdays[weekday]}曜）チャンネル名を「${newName}」に変更しました`);
    } catch (err) {
      console.error("💥 チャンネル名の変更中にエラー:", err);
    }
  };

  const scheduleDailyRename = () => {
    const now = new Date();
    const nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    if (nextTime < now) nextTime.setDate(nextTime.getDate() + 1);

    const delay = nextTime - now;
    console.log(`⏰ 次のオススメ曲の更新は: ${nextTime.toLocaleString()} に予定されています`);

    setTimeout(() => {
      renameChannel();
      scheduleDailyRename(); // 再スケジュール
    }, delay);
  };

  renameChannel();          // 初回実行
  scheduleDailyRename();    // 定期スケジュール
}
