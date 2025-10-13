import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';

const dataFile = path.resolve('commands/uni/data/points.json');

// JSONファイル読み込み
function loadPoints() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}');
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// JSONファイル保存
function savePoints(points) {
  fs.writeFileSync(dataFile, JSON.stringify(points, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName('uni-score')
  .setDescription('ユーザーのポイント管理')
  // --- add ---
  .addSubcommand(sub =>
    sub
      .setName('add')
      .setDescription('指定したユーザーにポイントを付与します')
      .addIntegerOption(opt =>
        opt
          .setName('value')
          .setDescription('付与するポイント数')
          .setRequired(true)
      )
      .addUserOption(opt =>
        opt
          .setName('username')
          .setDescription('ポイントを付与するユーザー')
          .setRequired(true)
      )
  )
  // --- remove ---
  .addSubcommand(sub =>
    sub
      .setName('remove')
      .setDescription('指定したユーザーのポイントを減らします')
      .addIntegerOption(opt =>
        opt
          .setName('value')
          .setDescription('減らすポイント数')
          .setRequired(true)
      )
      .addUserOption(opt =>
        opt
          .setName('username')
          .setDescription('ポイントを減らすユーザー')
          .setRequired(true)
      )
  )
  // --- check ---
  .addSubcommand(sub =>
    sub
      .setName('check')
      .setDescription('ユーザーの現在のポイントを確認します')
      .addUserOption(opt =>
        opt
          .setName('username')
          .setDescription('確認するユーザー')
          .setRequired(true)
      )
  )
  // --- rank ---
  .addSubcommand(sub =>
    sub
      .setName('rank')
      .setDescription('ポイントランキング上位5名を表示します')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const points = loadPoints();

  if (subcommand === 'add') {
    const value = interaction.options.getInteger('value');
    const user = interaction.options.getUser('username');
    const userId = user.id;

    if (!points[userId]) points[userId] = 0;
    points[userId] += value;

    savePoints(points);

    await interaction.reply({
      content: `✅ ${user.username} に ${value} ポイントを付与しました！（合計: ${points[userId]} pt）`,
      ephemeral: true,
    });

  } else if (subcommand === 'remove') {
    const value = interaction.options.getInteger('value');
    const user = interaction.options.getUser('username');
    const userId = user.id;

    if (!points[userId]) points[userId] = 0;
    points[userId] -= value;
    if (points[userId] < 0) points[userId] = 0; // マイナス防止

    savePoints(points);

    await interaction.reply({
      content: `⚠️ ${user.username} から ${value} ポイントを減算しました。（合計: ${points[userId]} pt）`,
      ephemeral: true,
    });

  } else if (subcommand === 'check') {
    const user = interaction.options.getUser('username');
    const userId = user.id;
    const userPoints = points[userId] || 0;

    await interaction.reply({
      content: `⭐ ${user.username} の現在のポイント: ${userPoints} pt`,
      ephemeral: true,
    });

  } else if (subcommand === 'rank') {
    // ランキング用の並び替え
    const sorted = Object.entries(points)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (sorted.length === 0) {
      await interaction.reply('📊 ランキングデータがまだありません！');
      return;
    }

    let rankMessage = '🏆 **ポイントランキング TOP5** 🏆\n\n';
    for (let i = 0; i < sorted.length; i++) {
      const [userId, score] = sorted[i];
      const user = await interaction.client.users.fetch(userId).catch(() => null);
      const name = user ? user.username : `不明なユーザー (${userId})`;

      const medal = ['🥇', '🥈', '🥉', '🏅', '🏅'][i];
      rankMessage += `${medal} **${name}**：${score} pt\n`;
    }

    await interaction.reply(rankMessage);
  }
}
