const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
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
  },
  {
    id: "pmarusama",
    start: "2026-10-22",
    end: "2026-12-09",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/10/7ae78d3096ae3b3a7d2167885fe1a2a5.png`
  },
  {
    id: "stream",
    start: "2026-10-22",
    end: "2026-12-09",
    content:
`https://info-chunithm.sega.jp/wp-content/uploads/2026/06/e3ebaed37634abf790458738f43a1d28.png`
  }
];

// 日本時間（JST）の今日を "YYYY-MM-DD" で返す。
// 期間判定はこの文字列の比較で行うため、終了日は「その日の終わりまで」有効になる
// （以前は new Date("2026-11-11") = UTC 0時と比較していたため、
//   終了日の朝9時（JST）に消えてしまっていた）。
function todayJstStr(nowMs = Date.now()) {
  const jst = new Date(nowMs + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

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

  const today = todayJstStr();

  // DBは最初に1回だけ取得して全イベントで使い回す
  // （以前はイベントごと（6回）に100件取得を繰り返していた）
  const dbEntries = await getEventDB(dbChannel);
  const dbByEventId = new Map(
    dbEntries.map(entry => [entry.data.eventId, entry])
  );

  for (const event of EVENTS) {

    const dbEntry = dbByEventId.get(event.id);

    // ===== 期間内（開始日〜終了日の当日末まで、JST） =====
    if (today >= event.start && today <= event.end) {

      // DBあり
      if (dbEntry) {

        try {

          const targetMsg =
            await postChannel.messages.fetch(
              dbEntry.data.messageId
            );

          // 内容が変わった時だけ編集する
          // （以前は10分ごとに同じ内容で編集していた）
          if (targetMsg.content !== event.content) {
            await targetMsg.edit(event.content);
          }

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
