import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("uni-roulette")
  .setDescription("1〜指定した数値までのルーレットを回します")
  .addIntegerOption(option =>
    option
      .setName("value")
      .setDescription("最大値（1〜）")
      .setRequired(true)
  );

export async function execute(interaction) {
  const value = interaction.options.getInteger("value");

  // バリデーション
  if (value < 1) {
    return interaction.reply({
      content: "数値は **1以上** を指定してください。",
      ephemeral: true
    });
  }

  if (value > 100000) {
    return interaction.reply({
      content: "数値が大きすぎます。（最大 100000）",
      ephemeral: true
    });
  }

  // ルーレット
  const result = Math.floor(Math.random() * value) + 1;

  const embed = new EmbedBuilder()
    .setTitle("ルーレット")
    .setColor(0x00bfff)
    .addFields(
      { name: "範囲", value: `1 ～ ${value}`, inline: true },
      { name: "結果", value: `**${result}**`, inline: true }
    )
    .setFooter({ text: `実行者: ${interaction.user.username}` });

  await interaction.reply({ embeds: [embed] });
}
