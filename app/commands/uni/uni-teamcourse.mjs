import { SlashCommandBuilder } from 'discord.js';
import songsData from '../../utils/DB/songs.mjs'; // 前回修正した正しいパス

const allSongs = Object.values(songsData).flat();

// export default ではなく、それぞれ個別に export します
export const data = new SlashCommandBuilder()
  .setName('create_course')
  .setDescription('チームコースのテンプレートを作成します')
  .addStringOption(option =>
    option.setName('course_name')
      .setDescription('コース名を入力してください')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('song1')
      .setDescription('1曲目の楽曲名')
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('diff1')
      .setDescription('1曲目の難易度')
      .setRequired(true)
      .addChoices(
        { name: '赤 (EXPERT)', value: '赤' },
        { name: '紫 (MASTER)', value: '紫' },
        { name: '黒 (ULTIMA)', value: '黒' }
      )
  )
  .addStringOption(option =>
    option.setName('song2')
      .setDescription('2曲目の楽曲名')
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('diff2')
      .setDescription('2曲目の難易度')
      .setRequired(true)
      .addChoices(
        { name: '赤 (EXPERT)', value: '赤' },
        { name: '紫 (MASTER)', value: '紫' },
        { name: '黒 (ULTIMA)', value: '黒' }
      )
  )
  .addStringOption(option =>
    option.setName('song3')
      .setDescription('3曲目の楽曲名')
      .setAutocomplete(true)
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('diff3')
      .setDescription('3曲目の難易度')
      .setRequired(true)
      .addChoices(
        { name: '赤 (EXPERT)', value: '赤' },
        { name: '紫 (MASTER)', value: '紫' },
        { name: '黒 (ULTIMA)', value: '黒' }
      )
  )
  .addIntegerOption(option =>
    option.setName('life')
      .setDescription('LIFEの値を指定してください')
      .setRequired(true)
      .addChoices(
        { name: '1', value: 1 }, { name: '2', value: 2 }, { name: '3', value: 3 },
        { name: '5', value: 5 }, { name: '8', value: 8 }, { name: '10', value: 10 },
        { name: '20', value: 20 }, { name: '30', value: 30 }, { name: '50', value: 50 },
        { name: '80', value: 80 }, { name: '100', value: 100 }, { name: '200', value: 200 },
        { name: '300', value: 300 }, { name: '500', value: 500 }
      )
  )
  .addStringOption(option =>
    option.setName('rule')
      .setDescription('LIFEが減少する判定を指定してください')
      .setRequired(true)
      .addChoices(
        { name: 'MISS', value: 'MISS' },
        { name: 'ATTACK', value: 'ATTACK' },
        { name: 'JUSTICE', value: 'JUSTICE' }
      )
  );

export async function autocomplete(interaction) {
  const focusedValue = interaction.options.getFocused();
  const filtered = allSongs
    .filter(song => song.includes(focusedValue))
    .slice(0, 25);
  
  await interaction.respond(
    filtered.map(song => ({ name: song, value: song }))
  );
}

export async function execute(interaction) {
  const courseName = interaction.options.getString('course_name');
  const song1 = interaction.options.getString('song1');
  const diff1 = interaction.options.getString('diff1');
  const song2 = interaction.options.getString('song2');
  const diff2 = interaction.options.getString('diff2');
  const song3 = interaction.options.getString('song3');
  const diff3 = interaction.options.getString('diff3');
  const life = interaction.options.getInteger('life');
  const rule = interaction.options.getString('rule');

  const resultText = `『コース名：${courseName}』\n\n` +
    `【楽曲名（ULTIMAもOK）】\n` +
    `１．${song1}［${diff1}］\n` +
    `２．${song2}［${diff2}］\n` +
    `３．${song3}［${diff3}］\n\n` +
    `【ルール】\n` +
    `LIFE:［${life}］\n` +
    `RULE:［${rule}］で LIFE -1`;

  await interaction.reply({ content: resultText });
}
