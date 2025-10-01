import { boostDates } from "./dates.mjs";

const targetChannelId = "1155482638493171782"; // 投稿するチャンネルID

export default async function(client) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const today = `${month}-${day}`;

  if (boostDates.includes(today)) {
    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (channel) {
        await channel.send(`test`);
        console.log(`ブースト日をアナウンスしました: ${today}`);
      }
    } catch (err) {
      console.error("メッセージ送信失敗:", err);
    }
  }
}
