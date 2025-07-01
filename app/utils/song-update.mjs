import channelNamePools from './DB/songs.mjs';

let hasScheduled = false;

const targetChannelId = "1380956236454953063";      // ボイスチャンネルID
const logChannelId = "1389492960424624129";         // ログ保存用のテキストチャンネル

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

// トピックから最終更新日と曲名を取得
async function getLogInfoFromTopic(client) {
  try {
    const channel = await client.channels.fetch(logChannelId);
    if (!channel || channel.type !== 0) return null;

    const topic = channel.topic || "";
    const match = topic.match(/lastUpdated:\s*(\d{4}-\d{2}-\d{2})\s*\|\s*song:\s*(.+)/);
    if (match) {
      return {
        lastUpdatedDate: match[1],
        lastSongName: match[2]
      };
    }
    return null;
  } catch (err) {
    console.error("❌ ログチャンネルのトピック読み取り失敗:", err);
    return null;
  }
}

// 日付と曲名をトピックに保存
async function setLogInfoInTopic(client, dateStr, songName) {
  try {
    const channel = await client.channels.fetch(logChannelId);
    if (!channel || channel.type !== 0) return;

    const topic = `lastUpdated: ${dateStr} | song: ${songName}`;
    await channel.setTopic(topic);
    console.log(`✅ トピックに保存しました: ${topic}`);
  } catch (err) {
    console.error("❌ トピックの更新失敗:", err);
  }
}

export default function song_update(client, isManual = false) {
  if (!isManual && hasScheduled) return;
  if (!isManual) hasScheduled = true;

  const renameChannel = async () => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("ja-JP");
    const weekday = today.getDay();

    const logInfo = await getLogInfoFromTopic(client);
    if (logInfo?.lastUpdatedDate === todayStr) {
      console.log(`⏭️ スキップ（${isManual ? "手動" : "自動"}）：${todayStr} は既に更新済み`);
      // 曲名だけ再セット（万一チャンネル名が他で変えられていても戻す）
      try {
        const channel = await client.channels.fetch(targetChannelId);
        if (channel?.type === 2) {
          await channel.setName(logInfo.lastSongName);
          console.log(`🎵 チャンネル名を既存の「${logInfo.lastSongName}」に再設定しました`);
        }
      } catch (e) {
        console.error("💥 チャンネル再設定中にエラー:", e);
      }
      return;
    }

    const pool = channelNamePools[weekday];
    if (!Array.isArray(pool) || pool.length === 0) {
      console.warn(`⚠️ ${weekdays[weekday]}曜の曲リストが見つかりません`);
      return;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const newName = pool[randomIndex];

    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || channel.type !== 2) {
        console.error("❌ ボイスチャンネルが見つからないかタイプ不一致");
        return;
      }

      await channel.setName(newName);
      await setLogInfoInTopic(client, todayStr, newName);
      console.log(`🎶 チャンネル名を「${newName}」（${weekdays[weekday]}曜）に変更しました`);
    } catch (err) {
      console.error("💥 チャンネル名の変更中にエラー:", err);
    }
  };

  const scheduleDailyRename = () => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
    if (next < now) next.setDate(next.getDate() + 1);
    const delay = next - now;

    console.log(`⏰ 次の更新予定: ${next.toLocaleString()}`);
    setTimeout(() => {
      renameChannel();
      scheduleDailyRename();
    }, delay);
  };

  renameChannel();
  scheduleDailyRename();
}
