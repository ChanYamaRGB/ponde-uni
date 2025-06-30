import { SlashCommandBuilder, ChannelType } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-emoji-count')
  .setDescription('指定した月のカスタム絵文字使用回数（リアクション含む）を集計します')
  .addIntegerOption(option =>
    option.setName('year')
      .setDescription('対象年')
      .setRequired(true)
  )
  .addIntegerOption(option =>
    option.setName('month')
      .setDescription('対象月')
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const year = interaction.options.getInteger('year');
  const month = interaction.options.getInteger('month') - 1; // JSの月は0始まり
  const guild = interaction.guild;

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

        for (const message of messages.values()) {
          const date = message.createdAt;
          if (date.getFullYear() !== year || date.getMonth() !== month) continue;

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

        lastId = messages.last()?.id;
        if (!lastId) break;
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

  const sortedDesc = Object.entries(emojiCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => `<:_:${id}>: ${count} 回`);

  const sortedAsc = Object.entries(emojiCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 10)
    .map(([id, count]) => `<:_:${id}>: ${count} 回`);

  const resultText =
    `${year}年${month + 1}月のカスタム絵文字使用回数\n\n` +
    `【使用回数 多い順トップ10】\n${sortedDesc.join('\n') || '該当なし'}\n\n` +
    `【使用回数 少ない順トップ10】\n${sortedAsc.join('\n') || '該当なし'}`;

  await interaction.editReply(resultText);
}
