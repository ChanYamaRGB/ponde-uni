const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "BlueArchive2",
    start: "2026-08-06",
    end: "2026-09-24",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/8981883b74c0092b5fc84ec352c18f80.png`
  },
  {
    id: "BlueArchive",
    start: "2026-08-06",
    end: "2026-09-24",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/9bf8122b5f2e3e8d0720024d4000040c-1024x576.png`
  },
  {
    id: "GuiltyGear",
    start: "2026-09-03",
    end: "2026-10-07",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/74c85ae49b959e3cc5c0eed4181d7efd.png`
  },
  {
    id: "ClashFever2",
    start: "2026-09-17",
    end: "2026-10-21",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/0a4635fedc4f3fc221b1042917b40752.png`
  },
  {
    id: "ClashFever1",
    start: "2026-09-17",
    end: "2026-10-21",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/28beca3e5f15349eb7b68176731b5416-1024x576.png`
  },
  {
    id: "StreetFighter6",
    start: "2026-09-03",
    end: "2026-10-27",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/fdfffc7fc266f338694099526b23301f.png`
  },
  {
    id: "iyowa",
    start: "2026-09-25",
    end: "2026-11-11",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/6a3fe119bc0fc7165b0cb42ff60eae6f.png`
  },
  {
    id: "dokidoki",
    start: "2026-09-25",
    end: "2026-11-11",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/642e4a0e5ce1fa6bb3d19f007f7afeaa.png`
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
