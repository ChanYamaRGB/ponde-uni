const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "takopi", // タコピーの原罪
    start: "2026-07-02",
    end: "2026-07-29",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/takopi.jpg?raw=true`
  },
  {
    id: "monsterhunter", // モンスターハンターワイルズ
    start: "2026-07-02",
    end: "2026-08-19",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/monsterhunter.jpg?raw=true`
  },
  {
    id: "groovecoaster", // グルーヴコースター
    start: "2026-07-02",
    end: "2026-08-05",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/groovecoaster.jpg?raw=true`
  },
  {
    id: "nikke", // NIKKE
    start: "2026-07-02",
    end: "2026-08-05",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/nikke.jpg?raw=true`
  },
  {
    id: "unlockchallenge6", // UNLOCK CHALLENGE 6
    start: "2026-07-02",
    end: "2026-08-19",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/unlockchallenge6.jpg?raw=true`
  },
  {
    id: "unlockchallenge7", // UNLOCK CHALLENGE 7
    start: "2026-07-02",
    end: "2026-08-19",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/unlockchallenge7.jpg?raw=true`
  },
  {
    id: "gekimai", // ゲキマイ楽曲連動
    start: "2026-07-02",
    end: "2027-07-02",
    content:
`https://github.com/ChanYamaRGB/ponde-uni/blob/main/app/utils/DB/gekimai.jpg?raw=true`
  },
  {
    id: "ayakaki", // いずれ菖蒲か杜若
    start: "2026-07-16",
    end: "2026-09-02",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/2f7904f104d5d02e308276dea7b0152a.png`
  },
  {
    id: "patora", // 周防パトラ
    start: "2026-07-16",
    end: "2026-09-02",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/d78c3263f6f8e7cfb89706e133c497cf.png`
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
