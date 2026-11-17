import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import path from 'path';

// ランキング画像用のフォント（uni-scoreと同じものを使う）
const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.ttf');
GlobalFonts.registerFromPath(fontPath, 'Noto Sans JP');

// 集計から除外するカテゴリのID（仕様として固定で除外する）
const EXCLUDED_CATEGORY_ID = '1156026769388863519';

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

// 進捗表示の文を作る（パーセントと「完了」の間は全角空白、全体をバッククォートで囲む）
function formatProgress(percent) {
  const gauge = '█'.repeat(Math.round(percent / 10)) + '　'.repeat(10 - Math.round(percent / 10));
  return `\`集計中... ${percent}%　完了[${gauge}]\``;
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

// 絵文字のID（スノーフレーク）から作成日時を求める。求められなければ null を返す。
function emojiCreatedAt(id) {
  try {
    // スノーフレークの上位ビットが、Discordのエポック（2015-01-01）からの経過ミリ秒
    return new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
  } catch {
    return null;
  }
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
  const D_TILE_H = 88;

  const gridRows = Math.ceil(current.length / COLS);
  const deletedShown = deleted.slice(0, 80);
  const deletedExtra = deleted.length - deletedShown.length;
  const deletedRows = Math.ceil(deletedShown.length / COLS);

  let height = TITLE_H + gridRows * TILE_H + 16;
  if (deletedShown.length > 0) {
    height += SECTION_H + deletedRows * D_TILE_H + (deletedExtra > 0 ? 28 : 0);
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

  // 削除済みの絵文字もタイル状に横並びにする（IDは表示しない）
  if (deletedShown.length > 0) {
    let y = TITLE_H + gridRows * TILE_H + 8;
    ctx.font = "bold 20px 'Noto Sans JP'";
    ctx.textAlign = 'left';
    ctx.fillText('削除済みのカスタム絵文字ランキング', 20, y + 26);
    y += SECTION_H;

    deletedShown.forEach((emoji, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = col * TILE_W;
      const dy = y + row * D_TILE_H;
      if (emoji.image) {
        ctx.drawImage(emoji.image, x + (TILE_W - 40) / 2, dy + 2, 40, 40);
      } else {
        ctx.strokeStyle = '#999999';
        ctx.strokeRect(x + (TILE_W - 40) / 2, dy + 2, 40, 40);
        ctx.font = "16px 'Noto Sans JP'";
        ctx.textAlign = 'center';
        ctx.fillText('?', x + TILE_W / 2, dy + 28);
      }
      // 名前（タイル幅に入らない場合は短く省略する。名前が無い場合は何も書かない）
      ctx.font = "11px 'Noto Sans JP'";
      ctx.textAlign = 'center';
      let label = emoji.name ? `:${emoji.name}:` : '';
      while (label.length > 1 && ctx.measureText(label).width > TILE_W - 6) {
        label = label.slice(0, -2) + '…';
      }
      if (label) ctx.fillText(label, x + TILE_W / 2, dy + 58);
      ctx.font = "15px 'Noto Sans JP'";
      ctx.fillText(`${emoji.count}`, x + TILE_W / 2, dy + 78);
    });

    if (deletedExtra > 0) {
      ctx.font = "16px 'Noto Sans JP'";
      ctx.textAlign = 'left';
      ctx.fillText(`ほか ${deletedExtra} 件`, 20, y + deletedRows * D_TILE_H + 22);
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

  // 「考え中」（deferReply）は使わず、最初の応答として0%の進捗を表示する
  await interaction.reply(formatProgress(0));

  const month = rawMonth - 1; // JSの月は0始まり
  const guild = interaction.guild;

  // 対象月の範囲 [monthStart, monthEnd)
  // ※月の境界はサーバーのローカル時刻基準です（Dockerでは TZ=Asia/Tokyo を設定済み）
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const emojiCounts = {};
  const emojiNames = {};
  const availableEmojiIds = new Set(guild.emojis.cache.map(e => e.id));

  // 仕様として、特定カテゴリ配下のチャンネルは集計対象から外す
  const textChannels = guild.channels.cache.filter(ch =>
    ch.type === ChannelType.GuildText &&
    ch.parentId !== EXCLUDED_CATEGORY_ID
  );
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
      await interaction.editReply(formatProgress(percent));
    }
  }

  if (Object.keys(emojiCounts).length === 0) {
    return interaction.editReply(`${year}年${month + 1}月のカスタム絵文字は見つかりませんでした。`);
  }

// 現在サーバーにあるカスタム絵文字（0回も含む）を回数順に並べる
const currentList = guild.emojis.cache
  .map(e => ({ id: e.id, name: e.name ?? "" }))
  .map(e => ({ ...e, count: emojiCounts[e.id] || 0 }))
  // 調査月より後に作られた絵文字は、その月にはまだ存在していないためランキングに載せない
  .filter(e => {
    const createdAt = emojiCreatedAt(e.id);
    return !createdAt || createdAt < monthEnd;
  })
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

// 削除済みの絵文字を回数順に並べる
// 削除済みは調査年月に作られた絵文字のみを含める（調査年月以前・以後は含めない）
const deletedList = Object.entries(emojiCounts)
  .filter(([id]) => !availableEmojiIds.has(id))
  .filter(([id]) => {
    const createdAt = emojiCreatedAt(id);
    return createdAt && createdAt >= monthStart && createdAt < monthEnd;
  })
  .map(([id, count]) => ({ id, name: emojiNames[id] || null, count }))
  .sort((a, b) => b.count - a.count || (a.name || "").localeCompare(b.name || ""));

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
    content: null,
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
      e.name ? `:${e.name}:: ${e.count}` : `（名称不明）: ${e.count}`
    );
    resultText +=
      `\n\n削除済みのカスタム絵文字ランキング（多い順）\n\n` +
      deletedText.join("\n");
  }

  await sendLongText(interaction, resultText);
}

}
