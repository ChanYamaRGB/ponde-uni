import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";
import fs from "fs";
import path from "path";

/* ===============================
   JSON ファイル関連
================================ */
const dataDir = path.resolve("data");
const dataPath = path.join(dataDir, "points.json");
const pointsPath = path.join(process.cwd(), "data", "points.json");

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({}, null, 2));
  }
}

function loadPoints() {
  try {
    if (!fs.existsSync(pointsPath)) {
      fs.writeFileSync(pointsPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(pointsPath, "utf8"));
  } catch (err) {
    console.error("[POINTS] 読み込み失敗:", err);
    return {};
  }
}

function savePoints(data) {
  try {
    fs.writeFileSync(pointsPath, JSON.stringify(data, null, 2));
    console.log("[POINTS] points.json に保存しました");
    console.log(
      `[POINTS] ${user.username} に ${amount}pt (${type})`
    );
  } catch (err) {
    console.error("[POINTS] 保存失敗:", err);
  }
}


/* ===============================
   コマンド定義
================================ */
export const data = new SlashCommandBuilder()
  .setName("uni-score")
  .setDescription("ポイント管理コマンド")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  // ===== 獲得ポイント =====
  .addSubcommandGroup(group =>
    group
      .setName("points")
      .setDescription("獲得ポイント管理")
      .addSubcommand(sub =>
        sub
          .setName("add")
          .setDescription("ポイントを付与")
          .addIntegerOption(o =>
            o.setName("value").setDescription("付与数").setRequired(true)
          )
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName("remove")
          .setDescription("ポイントを剥奪")
          .addIntegerOption(o =>
            o.setName("value").setDescription("剥奪数").setRequired(true)
          )
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
      )
  )

  // ===== 使用可能ポイント =====
  .addSubcommandGroup(group =>
    group
      .setName("usable")
      .setDescription("使用可能ポイント管理")
      .addSubcommand(sub =>
        sub
          .setName("add")
          .setDescription("使用可能ポイントを付与")
          .addIntegerOption(o =>
            o.setName("value").setDescription("付与数").setRequired(true)
          )
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
      )
      .addSubcommand(sub =>
        sub
          .setName("remove")
          .setDescription("使用可能ポイントを剥奪")
          .addIntegerOption(o =>
            o.setName("value").setDescription("剥奪数").setRequired(true)
          )
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
      )
  )

  // ===== ランキング =====
  .addSubcommandGroup(group =>
    group
      .setName("ranking")
      .setDescription("ポイントランキング")
      .addSubcommand(sub =>
        sub.setName("all").setDescription("全員分のランキングを表示")
      )
  );

/* ===============================
   実行処理
================================ */
export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  const value = interaction.options.getInteger("value");
  const user = interaction.options.getUser("user");

  const pointsData = loadPoints();

  const initUser = (id) => {
    if (!pointsData[id]) {
      pointsData[id] = { points: 0, usable: 0 };
    }
  };

  /* ===== points / usable ===== */
  if (group === "points" || group === "usable") {
    initUser(user.id);
    const key = group === "points" ? "points" : "usable";

    if (sub === "add") pointsData[user.id][key] += value;
    if (sub === "remove") {
      pointsData[user.id][key] = Math.max(
        0,
        pointsData[user.id][key] - value
      );
    }

    savePoints(pointsData);

    await interaction.reply(
      `${user.username} の ${key} を更新しました。\n現在値: ${pointsData[user.id][key]}pt`
    );
    return;
  }

  /* ===== ranking（Embed） ===== */
if (group === "ranking" && sub === "all") {
  if (Object.keys(pointsData).length === 0) {
    await interaction.reply("まだポイントデータがありません。");
    return;
  }

  const ranking = Object.entries(pointsData)
    .map(([userId, data]) => ({
      userId,
      points: data.points ?? 0,
      usable: data.usable ?? 0
    }))
    .sort((a, b) => b.points - a.points);

  const embed = new EmbedBuilder()
    .setTitle("🏆 貢献度ランキング")
    .setColor(0xffc107)
    .setTimestamp();

  for (let i = 0; i < ranking.length; i++) {
    const entry = ranking[i];

    let username = "不明なユーザー";
    try {
      const member = await interaction.guild.members.fetch(entry.userId);
      username = member.displayName;

    } catch {
      // サーバーから抜けたユーザーなど
    }

    embed.addFields({
      name: `${i + 1}位 ${username}`,
      value: `獲得ポイント: **${entry.points}pt**\n使用可能: **${entry.usable}pt**\n---`,
      inline: false
    });
  }

  await interaction.reply({ embeds: [embed] });
}
}
