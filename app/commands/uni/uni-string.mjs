import { SlashCommandBuilder } from 'discord.js';
import blackboardMap from './DB/blackboard.mjs';
import boldMap from './DB/bold.mjs';
import cursiveMap from './DB/cursive.mjs';
import frakturMap from './DB/fraktur.mjs';
import minchoMap from './DB/mincho.mjs';
import typewriterMap from './DB/typewriter.mjs';

// 変換処理一覧
const blackboardConvert = (str) =>
  str.split('').map(ch => blackboardMap[ch] ?? ch).join('');
const boldConvert = (str) =>
  str.split('').map(ch => boldMap[ch] ?? ch).join('');
const cursiveConvert = (str) =>
  str.split('').map(ch => cursiveMap[ch] ?? ch).join('');
const frakturConvert = (str) =>
  str.split('').map(ch => frakturMap[ch] ?? ch).join('');
const minchoConvert = (str) =>
  str.split('').map(ch => minchoMap[ch] ?? ch).join('');
const typewriterConvert = (str) =>
  str.split('').map(ch => typewriterMap[ch] ?? ch).join('');

const converters = {
  blackboard: blackboardConvert,
  bold: boldConvert,
  cursive: cursiveConvert,
  fraktur: frakturConvert,
  mincho: minchoConvert,
  typewriter: typewriterConvert
};


export const data = new SlashCommandBuilder()
  .setName('uni-string')
  .setDescription('文字列を指定形式に変換します')
  .addStringOption(option =>
    option.setName('mode')
      .setDescription('変換モードを選択')
      .setRequired(true)
      .addChoices(
        { name: '黒板太字 𝕊𝕒𝕞𝕡𝕝𝕖 𝕋𝕖𝕩𝕥', value: 'blackboard' },
        { name: '太字 𝗦𝗮𝗺𝗽𝗹𝗲 𝗧𝗲𝘅𝘁', value: 'bold' },
        { name: '筆記体 𝓢𝓪𝓶𝓹𝓵𝓮 𝓣𝓮𝔁𝓽', value: 'cursive' },
        { name: 'ドイツ文字 𝕾𝖆𝖒𝖕𝖑𝖊 𝕿𝖊𝖝𝖙', value: 'fraktur' },
        { name: '明朝体 𝐒𝐚𝐦𝐩𝐥𝐞 𝐓𝐞𝐱𝐭', value: 'mincho' },
        { name: 'タイプライタ体 𝚂𝚊𝚖𝚙𝚕𝚎 𝚃𝚎𝚡𝚝', value: 'typewriter' }
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
  await interaction.reply(`${result}`);
}
