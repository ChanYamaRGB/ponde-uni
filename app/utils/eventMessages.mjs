const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "eiketsu", // 英傑対戦
    start: "2026-04-16",
    end: "2026-07-01",
    content:
`https://cdn.wikiwiki.jp/to/w/chunithmwiki/%E8%8B%B1%E5%82%91%E5%A4%A7%E6%88%A6%E3%82%B3%E3%83%A9%E3%83%9C%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/::attach/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E5%91%8A%E7%9F%A5%28%E6%96%B0%29.jpg?rev=931fc00356bba8da68a87c5c77bbdb5e&t=20260504120240`
  },
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
  },
  {
    id: "takopi", // タコピーの原罪
    start: "2026-07-02",
    end: "2026-07-29",
    content:
`https://cdn.wikiwiki.jp/to/w/chunithmwiki/%E3%82%BF%E3%82%B3%E3%83%94%E3%83%BC%E3%81%AE%E5%8E%9F%E7%BD%AA%E3%82%B3%E3%83%A9%E3%83%9C%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/::attach/HLKrUA2bMAAWRpR.webp?rev=8a68667f68d6c9274574221a6dd2f0e2&t=20260622120541`
  },
  {
    id: "monsterhunter", // モンスターハンターワイルズ
    start: "2026-07-02",
    end: "2026-08-19",
    content:
`https://cdn.wikiwiki.jp/to/w/chunithmwiki/%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC%E3%83%8F%E3%83%B3%E3%82%BF%E3%83%BC%E3%83%AF%E3%82%A4%E3%83%AB%E3%82%BA%E3%82%B3%E3%83%A9%E3%83%9C%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88/::attach/HLDPWi2aEAAyHu_.webp?rev=d827e323fee509c385e453d981f09656&t=20260623150516`
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
