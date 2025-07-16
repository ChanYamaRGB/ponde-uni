import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-intro')
  .setDescription('自己紹介テンプレ');

export async function execute(interaction){
	await interaction.reply(`\`\`\`
自己紹介テンプレ

1. 名前（可能ならTwitter IDも）
2. 遊んでるゲームや趣味
3. 一言コメント
\`\`\``);
}
