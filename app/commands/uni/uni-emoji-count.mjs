import { SlashCommandBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-emoji-count')
  .setDescription('指定した月のカスタム絵文字使用回数（リアクション含む）を集計します')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addIntegerOption(option =>
    option.setName('year')
      .setDescription('対象年')
      .setRequired(true)
      .addChoices(
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

export async function execute(interaction) {
  await interaction.deferReply();

  const year = interaction.options.getInteger('year');
  const month = interaction.options.getInteger('month') - 1; // JSの月は0始まり
  const guild = interaction.guild;

  // 対象月の範囲 [monthStart, monthEnd)
  // ※月の境界はサーバーのローカル時刻基準です（Dockerでは TZ=Asia/Tokyo を設定済み）
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

  const emojiCounts = {};
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

          const matches = [...message.content.matchAll(/<a?:\w+:(\d+)>/g)];
          for (const [, id] of matches) {
            if (availableEmojiIds.has(id)) {
              emojiCounts[id] = (emojiCounts[id] || 0) + 1;
            }
          }

          message.reactions.cache.forEach(reaction => {
            const emoji = reaction.emoji;
            if (emoji.id && availableEmojiIds.has(emoji.id)) {
              emojiCounts[emoji.id] = (emojiCounts[emoji.id] || 0) + reaction.count;
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

// すべてのカスタム絵文字を取得（0回も含む）
const allEmojis = guild.emojis.cache.map(e => e.id);

// 使用回数付き配列を作成（未使用は0）
const sorted = allEmojis
  .map(id => [id, emojiCounts[id] || 0])
  .sort((a, b) => b[1] - a[1]) // 多い順
  .map(([id, count]) => `<:_:${id}>: ${count}`);

// 5個ごとに改行
let formatted = "";
sorted.forEach((emoji, index) => {
  formatted += emoji + "　";
  if ((index + 1) % 5 === 0) formatted += "\n";
});

const resultText =
  `${year}年${month + 1}月のカスタム絵文字ランキング（多い順）\n\n` +
  (formatted || "該当なし") +
  `\n\n※リアクション数は現在の件数で集計しています`;

await sendLongText(interaction, resultText);

}
