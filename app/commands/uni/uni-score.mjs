import {
  SlashCommandBuilder,
  EmbedBuilder
} from "discord.js";

import {
  createCanvas,
  GlobalFonts
} from "@napi-rs/canvas";
import { AttachmentBuilder } from "discord.js";

import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const nicknamesPath = path.join(
  __dirname,
  "data",
  "nicknames.json"
);

const DB_CHANNEL_ID = "1463094897174380587";

GlobalFonts.registerFromPath(
  path.join(
    process.cwd(),
    "fonts",
    "NotoSansJP-Regular.ttf"
  ),
  "Noto Sans JP"
);

// ===== タグ定義 =====
const TAGS = {
  ANGEL: {
    points: -50,
    label: "エンゼル券"
  },

  BOOST: {
    points: -30,
    label: "ブースト日設定券"
  },

  COURSE: {
    points: -20,
    label: "チームコース作成券"
  },

  ROLE_NAME: {
    points: -15,
    label: "ロールの名前作成券"
  },

  ROLE_COLOR: {
    points: -10,
    label: "ロールの色変更券"
  }
};

function loadNicknames() {
  try {
    if (!fs.existsSync(nicknamesPath)) {
      console.warn("[NICKNAMES] ファイルが存在しません");
      return {};
    }

    return JSON.parse(fs.readFileSync(nicknamesPath, "utf8"));
  } catch (err) {
    console.error("[NICKNAMES] 読み込み失敗:", err);
    return {};
  }
}

function parseData(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getAllUserData(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });

  const data = [];

  for (const msg of messages.values()) {
    if (!msg.author.bot) continue;

    const parsed = parseData(msg.content);

    if (parsed && parsed.id) {
      data.push({
        message: msg,
        data: parsed
      });
    }
  }

  return data;
}

async function getUserData(channel, userId) {
  const all = await getAllUserData(channel);
  return all.find(d => d.data.id === userId);
}

async function createRankingImage(
  sorted,
  nicknames,
  guild
) {
  const width = 900;
  const height = 150 + (sorted.length * 40);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // 背景
  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(0, 0, width, height);

  // タイトル
  ctx.fillStyle = "#ffffff";
  ctx.font = "22px 'Noto Sans JP'";
  ctx.fillText("貢献度ランキング", 20, 50);

  // ヘッダー
  ctx.font = "22px 'Noto Sans JP'";
  ctx.fillText("順位", 30, 100);
  ctx.fillText("ユーザー", 150, 100);
  ctx.fillText("累計", 650, 100);
  ctx.fillText("使用可能", 760, 100);

  let rank = 1;

  for (const { data } of sorted) {

    let displayName = nicknames[data.id];

    if (!displayName) {
      try {
        const member =
          await guild.members.fetch(data.id);

        displayName =
          member.nickname ??
          member.user.username;

      } catch {
        displayName = "Unknown";
      }
    }

    const y = 140 + ((rank - 1) * 40);

    ctx.fillStyle = "#ffffff";

    ctx.fillText(
      `${rank}`,
      30,
      y
    );

    ctx.fillText(
      displayName,
      150,
      y
    );

    ctx.fillText(
      String(data.points),
      650,
      y
    );

    ctx.fillText(
      String(data.usable),
      780,
      y
    );

    rank++;
  }

  return canvas.toBuffer("image/png");
}

// ===== Slash Command =====

export const data = new SlashCommandBuilder()
  .setName("uni-score")
  .setDescription("ポイント管理")

  // ===== add =====
  .addSubcommand(sub =>
    sub
      .setName("add")
      .setDescription("獲得ポイントを追加")
      .addUserOption(o =>
        o
          .setName("user")
          .setDescription("対象ユーザー")
          .setRequired(true)
      )
      .addIntegerOption(o =>
        o
          .setName("value")
          .setDescription("加算ポイント")
          .setRequired(true)
      )
  )

  // ===== remove =====
  .addSubcommand(sub =>
    sub
      .setName("remove")
      .setDescription("獲得ポイントを減算")
      .addUserOption(o =>
        o
          .setName("user")
          .setDescription("対象ユーザー")
          .setRequired(true)
      )
      .addIntegerOption(o =>
        o
          .setName("value")
          .setDescription("減算ポイント")
          .setRequired(true)
      )
  )

  // ===== usable =====
  .addSubcommand(sub =>
    sub
      .setName("usable")
      .setDescription("使用可能ポイント操作")

      .addStringOption(o =>
        o
          .setName("type")
          .setDescription("add / remove")
          .setRequired(true)
          .addChoices(
            { name: "add", value: "add" },
            { name: "remove", value: "remove" }
          )
      )

      .addUserOption(o =>
        o
          .setName("user")
          .setDescription("対象ユーザー")
          .setRequired(true)
      )

      .addIntegerOption(o =>
        o
          .setName("value")
          .setDescription("数値")
          .setRequired(true)
      )
  )

  // ===== tag =====
  .addSubcommand(sub =>
    sub
      .setName("tag")
      .setDescription("タグによるポイント操作")

      .addUserOption(o =>
        o
          .setName("user")
          .setDescription("対象ユーザー")
          .setRequired(true)
      )

      .addStringOption(o =>
        o
          .setName("type")
          .setDescription("タグ")
          .setRequired(true)
          .addChoices(
            { name: "ANGEL (-50pt)", value: "ANGEL" },
            { name: "BOOST (-30pt)", value: "BOOST" },
            { name: "COURSE (-20pt)", value: "COURSE" },
            { name: "ROLE_NAME (-15pt)", value: "ROLE_NAME" },
            { name: "ROLE_COLOR (-10pt)", value: "ROLE_COLOR" }
          )
      )
  )

  // ===== ranking =====
  .addSubcommand(sub =>
    sub
      .setName("ranking")
      .setDescription("ポイントランキングを表示")
  );

// ===== Execute =====

export async function execute(interaction) {

  const channel = await interaction.client.channels.fetch(DB_CHANNEL_ID);

  if (!channel || !channel.isTextBased()) {
    return interaction.reply({
      content: "DBチャンネルが見つかりません",
      ephemeral: true
    });
  }

  const sub = interaction.options.getSubcommand();

  // ===== tag =====
  if (sub === "tag") {

    const user = interaction.options.getUser("user");
    const type = interaction.options.getString("type");

    const tag = TAGS[type];

    if (!tag) {
      return interaction.reply({
        content: "無効なタグです",
        ephemeral: true
      });
    }

    const point = tag.points;

    let entry = await getUserData(channel, user.id);

    if (!entry) {

      const msg = await channel.send(
        JSON.stringify({
          id: user.id,
          points: 0,
          usable: point
        })
      );

      entry = {
        message: msg,
        data: {
          id: user.id,
          points: 0,
          usable: point
        }
      };

    } else {

      entry.data.usable += point;

      await entry.message.edit(
        JSON.stringify(entry.data)
      );
    }

    const sign = point >= 0 ? "+" : "";

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏷 タグポイント適用")
          .setDescription(
            `**${user.username}** に **${type}** を適用しました\n` +
            `ポイント変動： **${sign}${point}pt**`
          )
          .setColor(tag.color)
      ]
    });
  }

  // ===== add =====
  if (sub === "add") {

    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    let entry = await getUserData(channel, user.id);

    if (!entry) {

      const msg = await channel.send(
        JSON.stringify({
          id: user.id,
          points: value,
          usable: value
        })
      );

      entry = {
        message: msg,
        data: {
          id: user.id,
          points: value,
          usable: value
        }
      };

    } else {

      entry.data.points += value;
      entry.data.usable += value;

      await entry.message.edit(
        JSON.stringify(entry.data)
      );
    }

    return interaction.reply(
      `${user.username} に **${value}pt 追加**しました（使用可能 **+${value}pt**）`
    );
  }

  // ===== remove =====
  if (sub === "remove") {

    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    const entry = await getUserData(channel, user.id);

    if (!entry) {
      return interaction.reply({
        content: "データが存在しません",
        ephemeral: true
      });
    }

    entry.data.points = Math.max(
      0,
      entry.data.points - value
    );

    entry.data.usable = Math.max(
      0,
      entry.data.usable - value
    );

    await entry.message.edit(
      JSON.stringify(entry.data)
    );

    return interaction.reply(
      `${user.username} から **${value}pt 削除**しました（使用可能 **-${value}pt**）`
    );
  }

  // ===== usable =====
  if (sub === "usable") {

    const type = interaction.options.getString("type");
    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    const entry = await getUserData(channel, user.id);

    if (!entry) {
      return interaction.reply({
        content: "データが存在しません",
        ephemeral: true
      });
    }

    if (type === "add") {

      entry.data.usable += value;

      await entry.message.edit(
        JSON.stringify(entry.data)
      );

      return interaction.reply(
        `${user.username} に使用可能ポイントを **${value}pt 追加**しました`
      );
    }

    if (type === "remove") {

      // マイナス突入OK
      entry.data.usable -= value;

      await entry.message.edit(
        JSON.stringify(entry.data)
      );

      return interaction.reply(
        `${user.username} から使用可能ポイントを **${value}pt 削除**しました`
      );
    }
  }

  // ===== ranking =====
  if (sub === "ranking") {

    await interaction.deferReply();

    const nicknames = loadNicknames();

    const allData = await getAllUserData(channel);

    if (allData.length === 0) {
      return interaction.editReply(
        "まだポイントデータがありません。"
      );
    }

    const sorted = allData
      .sort((a, b) =>
        b.data.points - a.data.points
      )
      .slice(0, 20);

    let description = "";

    description +=
      "順位　ユーザー名　累計（使用可能）\n\n";

    let rank = 1;

    for (const { data } of sorted) {

      let displayName = nicknames[data.id];

      if (!displayName) {

        try {

          const member =
            await interaction.guild.members.fetch(data.id);

          displayName =
            member.nickname ??
            member.user.username;

        } catch {

          displayName = `Unknown (${data.id})`;
        }
      }

      description +=
        `**${rank}位　${displayName}**　${data.points}pt（${data.usable}pt）\n`;

      rank++;
    }

    const imageBuffer =
  await createRankingImage(
    sorted,
    nicknames,
    interaction.guild
  );

const attachment =
  new AttachmentBuilder(
    imageBuffer,
    { name: "ranking.png" }
  );

const embed =
  new EmbedBuilder()
    .setColor(0xf1c40f)
    .setImage(
      "attachment://ranking.png"
    );

return interaction.editReply({
  embeds: [embed],
  files: [attachment]
});
  }
}

console.log(
  fs.existsSync(
    path.join(
      process.cwd(),
      "fonts",
      "NotoSansJP-VariableFont_wght.ttf"
    )
  )
);

console.log(
  GlobalFonts.registerFromPath(...)
);
