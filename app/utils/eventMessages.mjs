import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const EVENT_ASSETS = path.join(__dirname, "..", "assets", "events");

const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "pmarusama",
    start: "2026-10-22",
    end: "2026-12-09",
    file: "pmarusama.png"
  },
  {
    id: "stream",
    start: "2026-10-22",
    end: "2026-12-09",
    file: "stream.png"
  },
  {
    id: "gesen",
    start: "2026-10-29",
    end: "2026-12-09",
    file: "gesen.png"
  },
  {
    id: "musedash",
    start: "2026-10-29",
    end: "2026-12-09",
    file: "musedash.png"
  },
  {
    id: "kop8th",
    start: "2026-12-04",
    end: "2026-12-19",
    file: "kop8th.png"
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

      // 画像ファイル形式（assets/events の画像を添付して投稿）
      if (event.file) {

        const filePath = path.join(EVENT_ASSETS, event.file);

        if (dbEntry) {

          try {

            const targetMsg =
              await postChannel.messages.fetch(
                dbEntry.data.messageId
              );

            // 旧形式（URL投稿）のままなら、同じ投稿を画像添付に差し替える
            if (!targetMsg.attachments || targetMsg.attachments.size === 0) {
              await targetMsg.edit({ content: "", files: [filePath] });
            }

          } catch {

            // 投稿消えてた
            const newMsg =
              await postChannel.send({ files: [filePath] });

            dbEntry.data.messageId = newMsg.id;

            await dbEntry.message.edit(
              JSON.stringify(dbEntry.data)
            );
          }

        } else {

          // 新規投稿
          const newMsg =
            await postChannel.send({ files: [filePath] });

          // DB保存
          await dbChannel.send(
            JSON.stringify({
              eventId: event.id,
              messageId: newMsg.id
            })
          );
        }

        continue;
      }

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
