export default function schedule_post(client) {
  const postMessage = async () => {
    const now = new Date();
    const today = now.getDate(); // 今日の日にち（1〜31）

    // 投稿する日付リスト（ここを変更すれば簡単に日付を増減できる）
    const targetDates = [6, 13, 20, 27];

    // 投稿先のチャンネルID
    const targetChannelId = "1155482638493171782"; // ←テキストチャンネルのIDに置き換えてください

    if (targetDates.includes(today)) {
      try {
        console.log(`チャンネルID ${targetChannelId} にメッセージを送信中...`);
        const channel = await client.channels.fetch(targetChannelId);

        if (!channel || !channel.isTextBased()) {
          console.error("指定したチャンネルが見つからないか、テキストチャンネルではありません。");
          return;
        }

        // 投稿内容（複数行OK）
        const messageContent = [
          "# ブースト日です‼️"
        ].join("\n");

        await channel.send({
        content: messageContent,
        files: ["https://new.chunithm-net.com/chuni-mobile/html/mobile/images/team_boost_day_info.png"] // ← 画像URL
        });

        console.log(`メッセージを送信しました: ${messageContent}`);
      } catch (error) {
        console.error("メッセージ送信に失敗しました:", error);
      }
    } else {
      console.log(`今日は対象日(${targetDates.join(", ")})ではないので投稿しません。`);
    }
  };

  const scheduleUpdate = () => {
    const now = new Date();
    const updateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      7, 0, 0 // 朝7時
    );

    if (updateTime < now) {
      updateTime.setDate(updateTime.getDate() + 1);
    }

    const delay = updateTime - now;
    console.log(`次の投稿チェックは: ${updateTime.toLocaleString()} に予定されています`);

    setTimeout(() => {
      postMessage();
      scheduleUpdate();
    }, delay);
  };

  // 初回実行
  scheduleUpdate();
}
