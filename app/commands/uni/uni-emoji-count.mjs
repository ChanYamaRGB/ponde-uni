import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'path';

// ランキング画像用のフォント（uni-scoreと同じものを使う）
const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Noto Sans JP');

export const data = new SlashCommandBuilder()
  .setName('uni-emoji-count')
  .setDescription('指定した月のカスタム絵文字使用回数（リアクション含む）を集計します')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(option =>
    option.setName('year')
      .setDescription('対象年')
      .setRequired(true)
      .addChoices(
        { name: '2023年', value: 2023 },
        { name: '2024年', value: 2024 },
        { name: '2025年', value: 2025 },
        { name: '2026年', value: 2026 },
        { name: '2027年', value: 2027 },
        { name: '2028年', value: 2028 },
        { name: '2029年', value: 2029 },
        { name: '2030年', value: 2030 }
      )
  )
  .addIntegerOption(option =>
    option.setName('month')
      .setDescription('対象月')
      .setRequired(true)
      .addChoices(
        { name: '1月', value: 1 },
        { name: '2月', value: 2 },
        { name: '3月', value: 3 },
        { name: '4月', value: 4 },
        { name: '5月', value: 5 },
        { name: '6月', value: 6 },
        { name: '7月', value: 7 },
        { name: '8月', value: 8 },
        { name: '9月', value: 9 },
        { name: '10月', value: 10 },
        { name: '11月', value: 11 },
        { name: '12月', value: 12 }
      )
  );

// 2000文字制限に収まるよう、行単位で分割して送る
async function sendLongText(interaction, text) {
  const MAX = 1900; // 制限2000に対して余裕を持つ
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if (current && current.length + 1 + line.length > MAX) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  await interaction.editReply(chunks[0]);
  for (const chunk of chunks.slice(1)) {
    await interaction.followUp(chunk);
  }
}

// 絵文字の画像をCDNから取得する。削除済みなどで取得できなければ null を返す。
async function fetchEmojiImage(id) {
  for (const ext of ['png', 'gif']) {
    try {
      const res = await fetch(`https://cdn.discordapp.com/emojis/${id}.${ext}`);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      return await loadImage(buf);
    } catch {
      // 次の拡張子を試す
    }
  }
  return null;
}

// ランキング画像を生成する。
// current: [{ id, name, count, image }] 現在の絵文字（回数順）
// deleted: [{ id, name, count, image }] 削除済みの絵文字（回数順、imageがnullの場合あり）
export async function createEmojiRankingImage(year, month, current, deleted) {
  const WIDTH = 640;
  const COLS = 8;
  const TILE_W = WIDTH / COLS;
  const TILE_H = 78;
  const TITLE_H = 64;
  const SECTION_H = 44;
  const ROW_H = 52;

  const gridRows = Math.ceil(current.length / COLS);
  const deletedShown = deleted.slice(0, 50);
  const deletedExtra = deleted.length - deletedShown.length;

  let height = TITLE_H + gridRows * TILE_H + 16;
  if (deletedShown.length > 0) {
    height += SECTION_H + deletedShown.length * ROW_H + (deletedExtra > 0 ? ROW_H : 0);
  }

  const canvas = createCanvas(WIDTH, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = '#000000';
  ctx.font = "bold 26px 'Noto Sans JP'";
  ctx.textAlign = 'left';
  ctx.fillText(`${year}年${month}月のカスタム絵文字ランキング`, 20, 42);

  // 現在の絵文字はタイル状に並べ、回数を下に書く
  current.forEach((emoji, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * TILE_W;
    const y = TITLE_H + row * TILE_H;
    if (emoji.image) {
      ctx.drawImage(emoji.image, x + (TILE_W - 44) / 2, y + 2, 44, 44);
    }
    ctx.font = "16px 'Noto Sans JP'";
    ctx.textAlign = 'center';
    ctx.fillText(`${emoji.count}`, x + TILE_W / 2, y + 68);
  });

  // 削除済みの絵文字は1行ずつ並べる
  if (deletedShown.length > 0) {
    let y = TITLE_H + gridRows * TILE_H + 8;
    ctx.font = "bold 20px 'Noto Sans JP'";
    ctx.textAlign = 'left';
    ctx.fillText('削除済みのカスタム絵文字ランキング', 20, y + 26);
    y += SECTION_H;

    deletedShown.forEach((emoji) => {
      if (emoji.image) {
        ctx.drawImage(emoji.image, 20, y + 6, 36, 36);
      } else {
        ctx.strokeStyle = '#999999';
        ctx.strokeRect(20, y + 6, 36, 36);
        ctx.font = "16px 'Noto Sans JP'";
        ctx.textAlign = 'center';
        ctx.fillText('?', 38, y + 30);
      }
      ctx.font = "18px 'Noto Sans JP'";
      ctx.textAlign = 'left';
      ctx.fillText(emoji.name ? `:${emoji.name}:` : `削除済み絵文字（ID: ${emoji.id}）`, 68, y + 32);
      ctx.textAlign = 'right';
      ctx.fillText(`${emoji.count}`, WIDTH - 20, y + 32);
      y += ROW_H;
    });

    if (deletedExtra > 0) {
      ctx.font = "16px 'Noto Sans JP'";
      ctx.textAlign = 'left';
      ctx.fillText(`ほか ${deletedExtra} 件`, 20, y + 30);
    }
  }

  return canvas.toBuffer('image/png');
}

export async function execute(interaction) {
  const year = interaction.options.getInteger('year');
  const rawMonth = interaction.options.getInteger('month');

  // カスタム絵文字を使い始めたのは2023年12月のため、2023年は12月のみ集計できる。
  // 年と月は別々の選択肢で、組み合わせはDiscord側では制限できないため、ここで弾く。
  if (year === 2023 && rawMonth !== 12) {
    return interaction.reply({
      content: '2023年は12月のみ集計できます（カスタム絵文字を使い始めたのが2023年12月のため）',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const month = rawMonth - 1; // JSの月は0始まり
  const guild = interaction.guild;

  // 対象月の範囲 [monthStart, monthEnd)
  // ※月の境界はサーバーのローカル時刻基準です（Dockerでは TZ=Asia/Tokyo を設定済み）
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const emojiCounts = {};
  const emojiNames = {};
  const availableEmojiIds = new Set(guild.emojis.cache.map(e => e.id));

  const textChannels = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText);
  const totalChannels = textChannels.size;
  let processedChannels = 0;

  for (const channel of textChannels.values()) {
    let lastId;
    try {
      while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        let oldestInBatch = null;

        for (const message of messages.values()) {
          const date = message.createdAt;
          if (!oldestInBatch || date < oldestInBatch) oldestInBatch = date;

          // 対象月の範囲外（新しい月・古い月）は数えない
          if (date < monthStart || date >= monthEnd) continue;

          // 現在は削除されている絵文字も含めて数える（表示の段階で振り分ける）。
          // 名前は、削除済み絵文字を表示するために本文の <:名前:ID> から控えておく。
          const matches = [...message.content.matchAll(/<a?:(\w+):(\d+)>/g)];
          for (const [, name, id] of matches) {
            emojiCounts[id] = (emojiCounts[id] || 0) + 1;
            if (!emojiNames[id]) emojiNames[id] = name;
          }

          message.reactions.cache.forEach(reaction => {
            const emoji = reaction.emoji;
            if (emoji.id) {
              emojiCounts[emoji.id] = (emojiCounts[emoji.id] || 0) + reaction.count;
              if (emoji.name && !emojiNames[emoji.id]) emojiNames[emoji.id] = emoji.name;
            }
          });
        }

        // 取得は新しい順なので、このバッチの最古が対象月より前なら
        // 以降のバッチはすべて対象外。チャンネルの全履歴を読み切らずに終える。
        if (oldestInBatch && oldestInBatch < monthStart) break;

        const newLastId = messages.last()?.id;
        if (!newLastId || newLastId === lastId) break;
        lastId = newLastId;
      }
    } catch (e) {
      console.warn(`⚠️ チャンネル「${channel.name}」の取得失敗: ${e.message}`);
      continue;
    }

    processedChannels++;

    // 進捗表示（10チャンネルごと or 最後）
    if (processedChannels % 10 === 0 || processedChannels === totalChannels) {
      const percent = Math.floor((processedChannels / totalChannels) * 100);
      await interaction.editReply(`集計中... ${percent}% 完了（${processedChannels}/${totalChannels}チャンネル）`);
    }
  }

  if (Object.keys(emojiCounts).length === 0) {
    return interaction.editReply(`${year}年${month + 1}月のカスタム絵文字は見つかりませんでした。`);
  }

// 現在サーバーにあるカスタム絵文字（0回も含む）を回数順に並べる
const currentList = guild.emojis.cache
  .map(e => ({ id: e.id, name: e.name ?? "" }))
  .map(e => ({ ...e, count: emojiCounts[e.id] || 0 }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

// 削除済みの絵文字を回数順に並べる
const deletedList = Object.entries(emojiCounts)
  .filter(([id]) => !availableEmojiIds.has(id))
  .map(([id, count]) => ({ id, name: emojiNames[id] || null, count }))
  .sort((a, b) => b.count - a.count || (a.name || "").localeCompare(b.name || ""));

const notes = ["※リアクション数は現在の件数で集計しています"];
if (deletedList.length > 0) {
  notes.push("※削除済みの絵文字は、画像が残っていない場合は名前のみで表示しています");
}

try {
  // 絵文字の画像を取得し、ランキング画像を生成して投稿する
  const withImages = await Promise.all(
    [...currentList, ...deletedList].map(async (e) => ({ ...e, image: await fetchEmojiImage(e.id) }))
  );
  const imageBuffer = await createEmojiRankingImage(
    year,
    month + 1,
    withImages.slice(0, currentList.length),
    withImages.slice(currentList.length)
  );
  const attachment = new AttachmentBuilder(imageBuffer, { name: "emoji-ranking.png" });

  await interaction.editReply({
    content: `${year}年${month + 1}月のカスタム絵文字ランキング\n` + notes.join("\n"),
    files: [attachment]
  });
} catch (err) {
  // 画像生成に失敗した場合は、従来のテキスト表示に切り替える
  console.error("絵文字ランキング画像の生成に失敗しました:", err);

  const sorted = currentList.map(e => `<:_:${e.id}>: ${e.count}`);

  // 5個ごとに改行
  let formatted = "";
  sorted.forEach((emoji, index) => {
    formatted += emoji + "　";
    if ((index + 1) % 5 === 0) formatted += "\n";
  });

  let resultText =
    `${year}年${month + 1}月のカスタム絵文字ランキング（多い順）\n\n` +
    (formatted || "該当なし");

  if (deletedList.length > 0) {
    const deletedText = deletedList.map(e =>
      e.name ? `:${e.name}:: ${e.count}` : `削除済み絵文字（ID: ${e.id}）: ${e.count}`
    );
    resultText +=
      `\n\n削除済みのカスタム絵文字ランキング（多い順）\n\n` +
      deletedText.join("\n");
  }

  resultText += `\n\n` + notes.join("\n");

  await sendLongText(interaction, resultText);
}

}
