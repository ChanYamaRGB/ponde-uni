import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-help')
  .setDescription('現在使えるコマンドを表示します');

export async function execute(interaction) {
  await interaction.reply({
    content: `\`\`\`
test
\`\`\``,
    ephemeral: true
  });
}
