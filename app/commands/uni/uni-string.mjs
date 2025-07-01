import { SlashCommandBuilder } from 'discord.js';
import cursiveMap from './DB/cursive-map.mjs';

// 変換処理一覧
const cursiveConvert = (str) =>
  str.split('').map(ch => cursiveMap[ch] ?? ch).join('');

const converters = {
  cursive: cursiveConvert
};


export const data = new SlashCommandBuilder()
  .setName('uni_moji')
  .setDescription('文字列を指定形式に変換します')
  .addStringOption(option =>
    option.setName('mode')
      .setDescription('変換モードを選択')
      .setRequired(true)
      .addChoices(
        { name: '筆記体', value: 'cursive' }
      )
  )
  .addStringOption(option =>
    option.setName('input')
      .setDescription('変換したい文字列')
      .setRequired(true)
  );

export async function execute(interaction) {
  const mode = interaction.options.getString('mode');
  const input = interaction.options.getString('input');

  const converter = converters[mode];
  if (!converter) {
    await interaction.reply(`❌ 未対応の変換モードです: ${mode}`);
    return;
  }

  const result = converter(input);
  await interaction.reply(`🔁 *${mode}* 変換結果：\n\`${result}\``);
}
