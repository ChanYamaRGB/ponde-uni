import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "../../data/points.json");

/* ---------- 共通処理 ---------- */
function loadPoints() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, "{}", "utf-8");
  }
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function savePoints(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export const data = new SlashCommandBuilder()
  .setName("uni-score")
  .setDescription("ポイント管理")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  .addSubcommandGroup(group =>
    group
      .setName("usable")
      .setDescription("usableポイント管理")

      .addSubcommand(cmd =>
        cmd
          .setName("add")
          .setDescription("usableポイントを付与")
          .addUserOption(opt =>
            opt.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName("amount").setDescription("付与数").setRequired(true)
          )
      )

      .addSubcommand(cmd =>
        cmd
          .setName("remove")
          .setDescription("usableポイントを剥奪")
          .addUserOption(opt =>
            opt.setName("user").setDescription("対象ユーザー").setRequired(true)
          )
          .addIntegerOption(opt =>
            opt.setName("amount").setDescription("剥奪数").setRequired(true)
          )
      )
  );

export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup();
  const sub = interaction.options.getSubcommand();

  if (group !== "usable") return;

  const user = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount");

  if (amount <= 0) {
    return interaction.reply({ content: "数値は1以上にしてください", ephemeral: true });
  }

  const points = loadPoints();

  if (!points[user.id]) {
    points[user.id] = { points: 0, usable: 0 };
  }

  if (sub === "add") {
    points[user.id].usable += amount;
  }

  if (sub === "remove") {
    points[user.id].usable = Math.max(
      0,
      points[user.id].usable - amount
    );
  }

  savePoints(points);

  await interaction.reply({
    content:
      `👤 ${user.username}\n` +
      `usableポイント: **${points[user.id].usable}**`
  });
}
