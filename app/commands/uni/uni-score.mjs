import {
  SlashCommandBuilder,
  EmbedBuilder
} from "discord.js";

import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const nicknamesPath = path.join(
  __dirname,
  'data',
  'nicknames.json'
);

function loadNicknames() {
  try {
    if (!fs.existsSync(nicknamesPath)) {
      console.warn('[NICKNAMES] ファイルが存在しません');
      return {};
    }
    return JSON.parse(fs.readFileSync(nicknamesPath, 'utf8'));
  } catch (err) {
    console.error('[NICKNAMES] 読み込み失敗:', err);
    return {};
  }
}

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

  // ===== points add =====
  .addSubcommand(sub =>
    sub
      .setName("add")
      .setDescription("獲得ポイントを追加")
      .addUserOption(o =>
        o.setName("user").setDescription("対象ユーザー").setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName("value").setDescription("加算ポイント").setRequired(true)
      )
  )

  // ===== points remove =====
  .addSubcommand(sub =>
    sub
      .setName("remove")
      .setDescription("獲得ポイントを減算")
      .addUserOption(o =>
        o.setName("user").setDescription("対象ユーザー").setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName("value").setDescription("減算ポイント").setRequired(true)
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
        o.setName("user").setDescription("対象ユーザー").setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName("value").setDescription("数値").setRequired(true)
      )
  )

  // ===== ranking =====
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

  // ===== points add =====
  if (sub === "add") {
    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    let entry = await getUserData(channel, user.id);

    if (!entry) {
      const msg = await channel.send(
      JSON.stringify({ id: user.id, points: value, usable: value })
      );
      entry = {
        message: msg,
        data: { id: user.id, points: value, usable: value }
      };
    } else {
      entry.data.points += value;
      entry.data.usable += value;
      await entry.message.edit(JSON.stringify(entry.data));
    }

    return interaction.reply(`${user.username} に **${value}pt 追加**しました（使用可能 **+${value}pt**）`);
  }

  // ===== points remove =====
  if (sub === "remove") {
    const user = interaction.options.getUser("user");
    const value = interaction.options.getInteger("value");

    const entry = await getUserData(channel, user.id);
    if (!entry) {
      return interaction.reply({ content: "データが存在しません", ephemeral: true });
    }

    entry.data.points = Math.max(0, entry.data.points - value);
    entry.data.usable = Math.max(0, entry.data.usable - value);

    await entry.message.edit(JSON.stringify(entry.data));

    return interaction.reply(`${user.username} から **${value}pt 削除**しました（使用可能 **-${value}pt**）`);
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

  if (type === "add") {
    entry.data.usable += value;
    await entry.message.edit(JSON.stringify(entry.data));
    return interaction.reply(`${user.username} に使用可能ポイントを **${value}pt 追加**しました`);
  }

  if (type === "remove") {
    entry.data.usable = Math.max(0, entry.data.usable - value);
    await entry.message.edit(JSON.stringify(entry.data));
    return interaction.reply(`${user.username} から使用可能ポイントを **${value}pt 削除**しました`);
  }
}

// ===== ranking =====
function getDisplayWidth(str) {
  let width = 0;
  for (const char of str) {
    if (char.match(/[ -~]/)) {
      width += 1;
    } else {
      width += 2;
    }
  }
  return width;
}

function toFullWidth(str) {
  return str.replace(/[A-Za-z0-9]/g, s =>
    String.fromCharCode(s.charCodeAt(0) + 0xFEE0)
  );
}

function fullWidthSpace(n) {
  return "　".repeat(n);
}
  
function padEndZenkaku(str, length) {
  return str + "　".repeat(length - str.length);
}

function padStartZenkaku(str, length) {
  return "　".repeat(length - str.length) + str;
}

function truncateFullWidth(str, maxWidth) {
  let result = "";
  let width = 0;

  for (const char of str) {
    const charWidth = char.match(/[ -~]/) ? 1 : 2;
    if (width + charWidth > maxWidth) break;
    result += char;
    width += charWidth;
  }

  return result;
}

  if (sub === "ranking") {
  await interaction.deferReply();

  const nicknames = loadNicknames();
  const allData = await getAllUserData(channel);

  if (allData.length === 0) {
    return interaction.editReply("まだポイントデータがありません。");
  }

  const sorted = allData
    .sort((a, b) => b.data.points - a.data.points)
    .slice(0, 20);

  let description = "";
    
    description += "```";
    description += "順位 | ユーザー名        | 累計   | 使用可能\n";
    description += "------------------------------------------\n";
  
  let rank = 1;

  for (const { data } of sorted) {
    let displayName = nicknames[data.id];

    if (!displayName) {
      try {
        const member = await interaction.guild.members.fetch(data.id);
        displayName = member.nickname ?? member.user.username;
      } catch {
        displayName = `Unknown (${data.id})`;
      }
    }

let name = toFullWidth(displayName);
name = name.slice(0, 10);

const rankStr = padStartZenkaku(toFullWidth(`${rank}`), 2) + "位";
const nameStr = padEndZenkaku(name, 10);
const pointStr = padStartZenkaku(toFullWidth(`${data.points}`), 4);
const usableStr = padStartZenkaku(toFullWidth(`${data.usable}`), 4);

description += `${rankStr}｜${nameStr}｜${pointStr}｜${usableStr}\n`;
    rank++;
  }
    description += "```";

  const embed = new EmbedBuilder()
    .setTitle("🏆 貢献度ランキング")
    .setDescription(description)
    .setColor(0xf1c40f);

  return interaction.editReply({ embeds: [embed] });
}

}
