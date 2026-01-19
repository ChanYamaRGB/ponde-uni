import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "commands/uni/data/points.json");

/* ---------- 共通処理 ---------- */
function loadPoints() {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, "{}", "utf-8");
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function savePoints(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName("uni_score")
  .setDescription("ポイント管理")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  /* ===== points（既存ポイント） ===== */
  .addSubcommandGroup(group =>
    group
      .setName("points")
      .setDescription("通常ポイント管理")

      .addSubcommand(cmd =>
        cmd
          .setName("add")
          .setDescription("ポイントを付与")
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(o =>
            o.setName("amount").setDescription("付与数").setRequired(true)
          )
      )

      .addSubcommand(cmd =>
        cmd
          .setName("remove")
          .setDescription("ポイントを剥奪")
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(o =>
            o.setName("amount").setDescription("剥奪数").setRequired(true)
          )
      )
  )

  /* ===== usable（新ポイント） ===== */
  .addSubcommandGroup(group =>
    group
      .setName("usable")
      .setDescription("usableポイント管理")

      .addSubcommand(cmd =>
        cmd
          .setName("add")
          .setDescription("usableポイントを付与")
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(o =>
            o.setName("amount").setDescription("付与数").setRequired(true)
          )
      )

      .addSubcommand(cmd =>
        cmd
          .setName("remove")
          .setDescription("usableポイントを剥奪")
          .addUserOption(o =>
            o.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(o =>
            o.setName("amount").setDescription("剥奪数").setRequired(true)
          )
      )
  );

export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount");

  if (amount <= 0) {
    return interaction.reply({ content: "数値は1以上にしてください", ephemeral: true });
  }

  const pointsData = loadPoints();

  if (!pointsData[user.id]) {
    pointsData[user.id] = { points: 0, usable: 0 };
  }

  const targetKey = group === "points" ? "points" : "usable";

  if (sub === "add") {
    pointsData[user.id][targetKey] += amount;
  }

  if (sub === "remove") {
    pointsData[user.id][targetKey] = Math.max(
      0,
      pointsData[user.id][targetKey] - amount
    );
  }

  savePoints(pointsData);

  await interaction.reply({
    content:
      `👤 ${user.username}\n` +
      `${targetKey}：**${pointsData[user.id][targetKey]}**`
  });
}

