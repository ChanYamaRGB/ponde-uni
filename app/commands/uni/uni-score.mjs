import { SlashCommandBuilder } from "discord.js";
import fs from "fs";
import path from "path";

const POINTS_FILE = path.join(process.cwd(), "data", "points.json");

// ポイントデータの読み込み・初期化
function loadPoints() {
  if (!fs.existsSync(POINTS_FILE)) {
    fs.mkdirSync(path.dirname(POINTS_FILE), { recursive: true });
    fs.writeFileSync(POINTS_FILE, JSON.stringify({}, null, 2));
  }
  return JSON.parse(fs.readFileSync(POINTS_FILE, "utf8"));
}

// ポイントデータの保存
function savePoints(data) {
  fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName("uni-score")
  .setDescription("ユーザーにポイントを付与します")
  .addSubcommand(subcommand =>
    subcommand
      .setName("add")
      .setDescription("指定したユーザーにポイントを付与します")
      .addIntegerOption(option =>
        option
          .setName("value")
          .setDescription("付与するポイント数")
          .setRequired(true)
      )
      .addUserOption(option =>
        option
          .setName("username")
          .setDescription("ポイントを付与するユーザー")
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.options.getSubcommand() !== "add") return;

  const value = interaction.options.getInteger("value");
  const user = interaction.options.getUser("username");

  const points = loadPoints();

  // まだポイントがないユーザーなら初期化
  if (!points[user.id]) {
    points[user.id] = 0;
  }

  points[user.id] += value;
  savePoints(points);

  await interaction.reply({
    content: `✅ ${user.username} に **${value} ポイント** を付与しました！\n現在の合計ポイント: **${points[user.id]} pt**`,
    ephemeral: true, // 実行者のみに表示
  });
}
