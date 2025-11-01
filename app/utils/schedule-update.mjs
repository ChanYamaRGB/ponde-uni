export default function schedule_update(client) {
  const updateChannelName = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const channelNames = {
      0: "🐧 ペンギンセレクション確定",   // 日
      1: "🤩 キャラクター EXP x1.5倍", // 月
      2: "🎲 マップマス数 +2", // 火
      3: "🤩 キャラクター EXP x1.5倍",   // 水
      4: "🎲 マップマス数 +2", // 木
      5: "🎀 超アバターチャンス",  // 金
      6: "💰 マップのメモリー x2倍"    // 土
    };

    const bonus_channelId = "1349297616839770122";

    try {
      console.log(`チャンネルID ${bonus_channelId} を取得中...`);
      const channel = await client.channels.fetch(bonus_channelId);

      if (!channel || channel.type !== 2) {
        console.error("指定したチャンネルが見つからないか、ボイスチャンネルではありません。");
        return;
      }

      await channel.setName(channelNames[dayOfWeek]);
      console.log(`チャンネル名を「${channelNames[dayOfWeek]}」に変更しました`);
    } catch (error) {
      console.error("チャンネルの取得または変更に失敗しました:", error);
    }
  };

  const scheduleUpdate = () => {
    const now = new Date();
    const updateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      7, 0, 0
    );

    if (updateTime < now) {
      updateTime.setDate(updateTime.getDate() + 1);
    }

    const delay = updateTime - now;
    console.log(`次の日替わりボーナスの更新は: ${updateTime.toLocaleString()} に予定されています`);

    setTimeout(() => {
      updateChannelName();
      scheduleUpdate();
    }, delay);
  };

  // 初回実行
  updateChannelName();
  scheduleUpdate();
}
