import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-teamcource')
  .setDescription('チームコース決めテンプレ');

export async function execute(interaction){
	await interaction.reply(`\`\`\`
『コース名：???』

【楽曲】
1. ???
2. ???
3. ???

【コースルール】
LIFE:［10，30，50，100，200，500］
RULE:［MISS，ATTACK，JUSTICE］で LIFE -1

【来月のぽんで賞】
??位
\`\`\``);
}
