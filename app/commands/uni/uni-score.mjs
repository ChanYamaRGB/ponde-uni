import {
  SlashCommandBuilder,
  EmbedBuilder
} from "discord.js";

const DB_CHANNEL_ID = "1463094897174380587";

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
      data.push({ message: msg, data: parsed });
    }
  }
  return data;
}

async function getUserData(channel, userId) {
  const all = await getAllUserData(channel);
  return all.find(d => d.data.id === userId);
}

export const data = new SlashCommandBuilder()
  .setName("uni-score")
  .setDescription("ポイント管理")
  .addSubcommand(sub =>
    sub
      .setName("add")
      .setDescription("ポイントを追加")
      .addUserOption(o =>
        o.setName("user").setDescription("対象ユーザー").setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName("value").setDescription("加算ポイント").setRequired(true)
      )
  )
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
        o.setName("user").setDescription("対象ユーザー").setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName("value").setDescription("数値").setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName("ranking")
      .setDescription("ポイントランキングを表示")
  );

export async function execute(interaction) {
  const channel = await interaction.client.channels.fetch(DB_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    return interaction.reply({ content: "DBチャンネルが見つかりません", ephemeral: true });
  }

  const sub = interaction.options.getSubcommand();

  // ===== add =====
  if (sub === "add") {
    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    let entry = await getUserData(channel, user.id);

    if (!entry) {
      const msg = await channel.send(
        JSON.stringify({ id: user.id, points: value, usable: 0 })
      );
      entry = { message: msg, data: { id: user.id, points: value, usable: 0 } };
    } else {
      entry.data.points += value;
      await entry.message.edit(JSON.stringify(entry.data));
    }

    return interaction.reply(`${user.username} に ${value}pt 追加しました`);
  }

  // ===== usable =====
  if (sub === "usable") {
    const type = interaction.options.getString("type");
    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    const entry = await getUserData(channel, user.id);
    if (!entry) {
      return interaction.reply({ content: "データが存在しません", ephemeral: true });
    }

    if (type === "add") entry.data.usable += value;
    if (type === "remove") entry.data.usable = Math.max(0, entry.data.usable - value);

    await entry.message.edit(JSON.stringify(entry.data));

    return interaction.reply(`${user.username} の usable を更新しました`);
  }

  // ===== ranking =====
  if (sub === "ranking") {
    const all = await getAllUserData(channel);

    all.sort((a, b) => b.data.points - a.data.points);

    const lines = await Promise.all(
      all.map(async (e, i) => {
        const user = await interaction.client.users.fetch(e.data.id);
        return `**${i + 1}. ${user.username}**\n獲得ポイント: ${e.data.points}pt（使用可能: ${e.data.usable}pt）`;
      })
    );

    const embed = new EmbedBuilder()
      .setTitle("🏆 ポイントランキング")
      .setDescription(lines.join("\n---\n"))
      .setColor(0x00bfff);

    return interaction.reply({ embeds: [embed] });
  }
}
