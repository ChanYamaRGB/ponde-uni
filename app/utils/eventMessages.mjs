const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "himehina", // HIMEHINA
    start: "2026-05-14",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/05/594b6d77e373686c4e7b0de0bfc55248.png`
  },
  {
    id: "mikakunin", // 未確認で生命体
    start: "2026-05-14",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/05/9089d377919b32da577b5d640aa9c961-1024x576.png`
  },
  {
    id: "rare", // レア・エ・フラータ
    start: "2026-05-14",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/05/b28a15466b167f9d52ab061bc0ed2a16.png`
  },
  {
    id: "diverse2", // Diverse System 第二弾
    start: "2026-05-28",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/05/928dbe40bbe9c6e4542638b5bf8e9158.png`
  },
  {
    id: "diverse", // Diverse System
    start: "2026-05-28",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/04/2c9f5ccfaf5cf80c846860906af8a186-1024x576.png`
  },
  {
    id: "wich", // サノバウィッチ
    start: "2026-06-11",
    end: "2026-07-01",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/fc9905b5323efb956d1465079f567db1.png`
  }
];

async function getEventDB(channel) {

  const messages =
    await channel.messages.fetch({ limit: 100 });

  const data = [];

  for (const msg of messages.values()) {

    if (!msg.author.bot) continue;

    try {

      const parsed = JSON.parse(msg.content);

      if (parsed.eventId) {

        data.push({
          message: msg,
          data: parsed
        });
      }

    } catch {}
  }

  return data;
}

async function getEventData(channel, eventId) {

  const all = await getEventDB(channel);

  return all.find(
    d => d.data.eventId === eventId
  );
}

export async function updateEvents(client) {

  const postChannel =
    await client.channels.fetch(EVENT_CHANNEL_ID);

  const dbChannel =
    await client.channels.fetch(EVENT_DB_CHANNEL_ID);

  if (
    !postChannel?.isTextBased() ||
    !dbChannel?.isTextBased()
  ) {
    return;
  }

  const now = new Date();

  for (const event of EVENTS) {

    const start = new Date(event.start);
    const end = new Date(event.end);

    const dbEntry =
      await getEventData(dbChannel, event.id);

    // ===== 期間内 =====
    if (now >= start && now <= end) {

      // DBあり
      if (dbEntry) {

        try {

          const targetMsg =
            await postChannel.messages.fetch(
              dbEntry.data.messageId
            );

          // 編集
          await targetMsg.edit(event.content);

        } catch {

          // 投稿消えてた
          const newMsg =
            await postChannel.send(event.content);

          dbEntry.data.messageId = newMsg.id;

          await dbEntry.message.edit(
            JSON.stringify(dbEntry.data)
          );
        }

      } else {

        // 新規投稿
        const newMsg =
          await postChannel.send(event.content);

        // DB保存
        await dbChannel.send(
          JSON.stringify({
            eventId: event.id,
            messageId: newMsg.id
          })
        );
      }
    }

    // ===== 期間外 =====
    else {

      if (dbEntry) {

        try {

          const targetMsg =
            await postChannel.messages.fetch(
              dbEntry.data.messageId
            );

          await targetMsg.delete();

        } catch {}

        await dbEntry.message.delete();
      }
    }
  }
}
