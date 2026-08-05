import { SlashCommandBuilder } from 'discord.js';
import songsData from '../../utils/DB/songs.mjs'; // songs.mjsを読み込む

// 全楽曲を1つの配列に平坦化（オートコンプリート検索用）
const allSongs = Object.values(songsData).flat();

export default {
  data: new SlashCommandBuilder()
    .setName('create_course')
    .setDescription('チームコースのテンプレートを作成します')
    // 1. コース名（テキスト入力）
    .addStringOption(option =>
      option.setName('course_name')
        .setDescription('コース名を入力してください')
        .setRequired(true)
    )
    // 2. 1曲目（オートコンプリート）
    .addStringOption(option =>
      option.setName('song1')
        .setDescription('1曲目の楽曲名')
        .setAutocomplete(true)
        .setRequired(true)
    )
    // 3. 1曲目 難易度（プルダウン）
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
    // 4. 2曲目（オートコンプリート）
    .addStringOption(option =>
      option.setName('song2')
        .setDescription('2曲目の楽曲名')
        .setAutocomplete(true)
        .setRequired(true)
    )
    // 5. 2曲目 難易度（プルダウン）
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
    // 6. 3曲目（オートコンプリート）
    .addStringOption(option =>
      option.setName('song3')
        .setDescription('3曲目の楽曲名')
        .setAutocomplete(true)
        .setRequired(true)
    )
    // 7. 3曲目 難易度（プルダウン）
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
    // 8. LIFE設定（プルダウン）
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
    // 9. RULE設定（プルダウン）
    .addStringOption(option =>
      option.setName('rule')
        .setDescription('LIFEが減少する判定を指定してください')
        .setRequired(true)
        .addChoices(
          { name: 'MISS', value: 'MISS' },
          { name: 'ATTACK', value: 'ATTACK' },
          { name: 'JUSTICE', value: 'JUSTICE' }
        )
    ),

  // オートコンプリート（楽曲検索）の処理
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    // 入力された文字を含む楽曲を検索し、Discordの上限である25件までに絞り込む
    const filtered = allSongs
      .filter(song => song.includes(focusedValue))
      .slice(0, 25);
    
    await interaction.respond(
      filtered.map(song => ({ name: song, value: song }))
    );
  },

  // コマンド実行時の処理
  async execute(interaction) {
    // ユーザーの入力・選択内容を取得
    const courseName = interaction.options.getString('course_name');
    const song1 = interaction.options.getString('song1');
    const diff1 = interaction.options.getString('diff1');
    const song2 = interaction.options.getString('song2');
    const diff2 = interaction.options.getString('diff2');
    const song3 = interaction.options.getString('song3');
    const diff3 = interaction.options.getString('diff3');
    const life = interaction.options.getInteger('life');
    const rule = interaction.options.getString('rule');

    // テンプレートの形式にフォーマット
    const resultText = `『コース名：${courseName}』\n\n` +
      `【楽曲名】\n` +
      `１．${song1}［${diff1}］\n` +
      `２．${song2}［${diff2}］\n` +
      `３．${song3}［${diff3}］\n\n` +
      `【ルール】\n` +
      `LIFE:［${life}］\n` +
      `RULE:［${rule}］で LIFE -1`;

    // 結果を送信
    await interaction.reply({ content: resultText });
  },
};
