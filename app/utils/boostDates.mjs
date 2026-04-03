const DB_CHANNEL_ID = "1465227812884578346";

function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function loadData(channel) {
  const messages = await channel.messages.fetch({ limit: 10 });

  for (const msg of messages.values()) {
    if (!msg.author.bot) continue;

    const parsed = parseJSON(msg.content);
    if (parsed && parsed.messageId) {
      return { message: msg, data: parsed };
    }
  }

  return null;
}

async function saveData(channel, data, oldMessage = null) {
  if (oldMessage) {
    await oldMessage.edit(JSON.stringify(data));
    return oldMessage;
  }

  return await channel.send(JSON.stringify(data));
}

export default function schedule_post(client) {

  const targetDates = [4, 19, 27, 29];
  // const targetDates = [];
  const targetChannelId = "1155482638493171782";

  const postOrDelete = async () => {
    const now = new Date();
    const today = now.getDate();

    const dbChannel = await client.channels.fetch(DB_CHANNEL_ID);
    if (!dbChannel || !dbChannel.isTextBased()) return;

    const dataEntry = await loadData(dbChannel);

    const channel = await client.channels.fetch(targetChannelId);
    if (!channel || !channel.isTextBased()) return;

    /* ---------- 対象日：投稿 ---------- */
    if (targetDates.includes(today)) {
      if (dataEntry?.data?.messageId) return;

      const msg = await channel.send({
        content: "# ブースト日です‼️",
        files: [
          "https://new.chunithm-net.com/chuni-mobile/html/mobile/images/team_boost_day_info.png"
        ]
      });

      await saveData(
        dbChannel,
        { messageId: msg.id },
        dataEntry?.message
      );

      console.log("ブースト告知を投稿しました");
      return;
    }

    /* ---------- 対象日以外：削除 ---------- */
    if (dataEntry?.data?.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(dataEntry.data.messageId);
        await oldMsg.delete();
        console.log("期限切れのブースト告知を削除しました");
      } catch {
        console.log("メッセージは既に削除されています");
      }

      await dataEntry.message.delete().catch(() => {});
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

    setTimeout(() => {
      postOrDelete();
      scheduleUpdate();
    }, delay);
  };

  scheduleUpdate();
}
