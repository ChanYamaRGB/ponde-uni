import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';

const dataFile = path.resolve('./data/points.json');

// JSONファイルの読み込み関数
function loadPoints() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '{}');
  }
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// JSONファイルの保存関数
function savePoints(points) {
  fs.writeFileSync(dataFile, JSON.stringify(points, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName('uni_score')
  .setDescription('ユーザーにポイントを付与または確認します')
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
  // 管理者専用にしたい場合はこの行を追加
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

  } else if (subcommand === 'check') {
    const user = interaction.options.getUser('username');
    const userId = user.id;

    const userPoints = points[userId] || 0;

    await interaction.reply({
      content: `⭐ ${user.username} の現在のポイント: ${userPoints} pt`,
      ephemeral: true,
    });
  }
}
