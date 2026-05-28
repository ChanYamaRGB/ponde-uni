const EVENT_CHANNEL_ID = "1509439643156873226";
const EVENT_DB_CHANNEL_ID = "1509445014906736750";

const EVENTS = [
  {
    id: "20260514",
    start: "2026-05-14",
    end: "2026-07-01",
    content:
`**2026.05.14 ～ 07.01**
\`\`\`
▽ イベント
  ◆ HIMEHINA
  ◆ 未確認で進行形〈復刻〉
▽ ミッション
  ◆ レア・エ・フラータ
▽ 全国対戦報酬
  ◆『PANDORA PARADOXXX』
  ◆『μ3』
  ◆『†渚の小悪魔ラヴリィ～レイディオ†』
  ◆『聖者の息吹』
  ◆『超MANJIラッシュ』
  ◆『Lips XTC -Sorist Remix-』
  ◆『ALTER EGO』
  ◆『Marigold』
  ◆『glory MAX -to the MAXimum-』
  ◆『DESTRUCTION 3,2,1』
  ◆『Ré：Ré』
\`\`\``
  },
  
  {
    id: "20260520",
    start: "2026-05-20",
    end: "2026-06-30",
    content:
`**2026.05.20 ～ 06.30**
\`\`\`
▽ 楽曲公募関連イベント
  ◆ 第７回 オリジナル楽曲コンテスト
    ▽ 対象キャラ
      ◆〔メグ・カールステット〕
      ◆〔Dr.メト・バサナテル〕
      ◆〔ストゥム＆レヴル〕
      ◆〔ヨナ・ライゼ〕
      ◆〔再生者ディアン〕
\`\`\``
  },

  {
    id: "20260528",
    start: "2026-05-28",
    end: "2026-07-01",
    content:
`**2026.05.28 ～ 07.01**
\`\`\`
▽ イベント
  ◆ Diverse System 第二弾
  ◆ Diverse System〈復刻〉
\`\`\``
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
