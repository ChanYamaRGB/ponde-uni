import { SlashCommandBuilder } from 'discord.js';
import songsData from '../../utils/DB/songs.mjs'; // 前回修正した正しいパス

const allSongs = Object.values(songsData).flat();

// export default ではなく、それぞれ個別に export します
export const data = new SlashCommandBuilder()
  .setName('uni-teamcourse')
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
  .addStringOption(option =>import { 
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
  ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, ComponentType 
} from 'discord.js';
import songsData from '../../utils/DB/songs.mjs'; // 正しいパス

const allSongs = Object.values(songsData).flat();

export const data = new SlashCommandBuilder()
  .setName('create_course')
  .setDescription('専用パネルを使ってチームコースを作成します（対話型UI）');

export async function execute(interaction) {
  // --- 1. コース情報の保存用データ（初期状態） ---
  let courseName = "未設定";
  let songs = [
    { name: "未設定", diff: "未設定" },
    { name: "未設定", diff: "未設定" },
    { name: "未設定", diff: "未設定" }
  ];
  let rule = { life: "未設定", type: "未設定" };

  // --- 2. UIの表示状態を管理する変数 ---
  let currentMode = 'main'; // 'main': メイン画面, 'song': 楽曲選択画面, 'rule': ルール設定画面
  let editingSongIndex = 0; // 現在編集中の楽曲番号（0〜2）
  let searchResults = [];   // 楽曲の検索結果を保存

  // --- 3. Embed（プレビュー画面）を生成する関数 ---
  const generateEmbed = () => {
    return new EmbedBuilder()
      .setColor(0xFF0055)
      .setTitle(`『コース名：${courseName}』`)
      .setDescription('以下のボタンを押して設定を変更してください。')
      .addFields(
        { name: '【楽曲名（ULTIMAもOK）】', value: 
          `１．${songs[0].name}［${songs[0].diff}］\n` +
          `２．${songs[1].name}［${songs[1].diff}］\n` +
          `３．${songs[2].name}［${songs[2].diff}］` 
        },
        { name: '【ルール】', value: `LIFE:［${rule.life}］\nRULE:［${rule.type}］で LIFE -1` }
      )
      .setFooter({ text: currentMode === 'main' ? '全て設定したら「完成して出力」を押してください' : '設定を選んだら「メイン画面に戻る」を押してください' });
  };

  // --- 4. ボタンやプルダウン（コンポーネント）を生成する関数 ---
  const generateComponents = () => {
    if (currentMode === 'main') {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_name').setLabel('👑 コース名').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_song_0').setLabel('🎵 1曲目').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_song_1').setLabel('🎵 2曲目').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_song_2').setLabel('🎵 3曲目').setStyle(ButtonStyle.Secondary)
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_rule').setLabel('⚙️ ルール設定').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_finish').setLabel('✨ 完成して出力').setStyle(ButtonStyle.Success)
      );
      return [row1, row2];
    } 
    else if (currentMode === 'song') {
      const songSelect = new StringSelectMenuBuilder()
        .setCustomId('select_song')
        .setPlaceholder('▼ 検索結果から楽曲を選択してください');
      
      searchResults.forEach(song => {
        // プルダウンの文字数制限(100文字)を超えないようにカット
        songSelect.addOptions({ label: song.substring(0, 100), value: song.substring(0, 100) });
      });

      const diffSelect = new StringSelectMenuBuilder()
        .setCustomId('select_diff')
        .setPlaceholder('▼ 難易度を選択してください')
        .addOptions(
          { label: '赤 (EXPERT)', value: '赤' },
          { label: '紫 (MASTER)', value: '紫' },
          { label: '黒 (ULTIMA)', value: '黒' }
        );
      
      const okBtn = new ButtonBuilder().setCustomId('btn_back').setLabel('メイン画面に戻る').setStyle(ButtonStyle.Success);

      return [
        new ActionRowBuilder().addComponents(songSelect),
        new ActionRowBuilder().addComponents(diffSelect),
        new ActionRowBuilder().addComponents(okBtn)
      ];
    }
    else if (currentMode === 'rule') {
      const lifeSelect = new StringSelectMenuBuilder()
        .setCustomId('select_life')
        .setPlaceholder('▼ LIFEを選択してください')
        .addOptions([1, 2, 3, 5, 8, 10, 20, 30, 50, 80, 100, 200, 300, 500].map(n => ({ label: `LIFE: ${n}`, value: String(n) })));
      
      const typeSelect = new StringSelectMenuBuilder()
        .setCustomId('select_type')
        .setPlaceholder('▼ 減少条件を選択してください')
        .addOptions(
          { label: 'MISS で減少', value: 'MISS' },
          { label: 'ATTACK で減少', value: 'ATTACK' },
          { label: 'JUSTICE で減少', value: 'JUSTICE' }
        );

      const okBtn = new ButtonBuilder().setCustomId('btn_back').setLabel('メイン画面に戻る').setStyle(ButtonStyle.Success);

      return [
        new ActionRowBuilder().addComponents(lifeSelect),
        new ActionRowBuilder().addComponents(typeSelect),
        new ActionRowBuilder().addComponents(okBtn)
      ];
    }
  };

  // --- 5. メインパネルを送信して待機開始 ---
  const response = await interaction.reply({
    embeds: [generateEmbed()],
    components: generateComponents(),
    fetchReply: true
  });

  // 10分間（600000ミリ秒）ボタン等の操作を受け付ける
  const collector = response.createMessageComponentCollector({ time: 600000 });

  collector.on('collect', async (i) => {
    // コマンド実行者以外が押した場合は弾く
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: '自分だけが操作できます。', ephemeral: true });
    }

    // --- 👑 コース名の設定（ポップアップ入力） ---
    if (i.customId === 'btn_name') {
      const modal = new ModalBuilder().setCustomId('modal_name').setTitle('コース名設定');
      const input = new TextInputBuilder().setCustomId('input_name').setLabel('コース名を入力してください').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      
      await i.showModal(modal);
      const submitted = await i.awaitModalSubmit({ time: 60000, filter: mi => mi.user.id === interaction.user.id }).catch(() => null);
      if (submitted) {
        courseName = submitted.fields.getTextInputValue('input_name');
        await submitted.update({ embeds: [generateEmbed()] });
      }
    }

    // --- 🎵 楽曲の設定（ポップアップ検索 ➡ プルダウン） ---
    if (i.customId.startsWith('btn_song_')) {
      editingSongIndex = parseInt(i.customId.split('_').pop()); // 0, 1, 2のどれかを取得
      
      const modal = new ModalBuilder().setCustomId('modal_search').setTitle(`${editingSongIndex + 1}曲目の検索`);
      const input = new TextInputBuilder().setCustomId('input_keyword').setLabel('楽曲名の一部（ひらがな等）を入力').setStyle(TextInputStyle.Short).setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      
      await i.showModal(modal);
      const submitted = await i.awaitModalSubmit({ time: 60000, filter: mi => mi.user.id === interaction.user.id }).catch(() => null);
      
      if (submitted) {
        const keyword = submitted.fields.getTextInputValue('input_keyword');
        searchResults = allSongs.filter(song => song.includes(keyword)).slice(0, 25); // 上限25件
        
        if (searchResults.length === 0) {
          await submitted.reply({ content: `「${keyword}」を含む楽曲が見つかりませんでした。`, ephemeral: true });
        } else {
          currentMode = 'song'; // 楽曲選択モードに切り替え
          await submitted.update({ embeds: [generateEmbed()], components: generateComponents() });
        }
      }
    }

    // 楽曲用プルダウンが選ばれた時
    if (i.customId === 'select_song') {
      songs[editingSongIndex].name = i.values[0];
      await i.update({ embeds: [generateEmbed()] });
    }
    if (i.customId === 'select_diff') {
      songs[editingSongIndex].diff = i.values[0];
      await i.update({ embeds: [generateEmbed()] });
    }

    // --- ⚙️ ルールの設定 ---
    if (i.customId === 'btn_rule') {
      currentMode = 'rule'; // ルール選択モードに切り替え
      await i.update({ components: generateComponents() });
    }
    if (i.customId === 'select_life') {
      rule.life = i.values[0];
      await i.update({ embeds: [generateEmbed()] });
    }
    if (i.customId === 'select_type') {
      rule.type = i.values[0];
      await i.update({ embeds: [generateEmbed()] });
    }

    // --- 🔙 メイン画面に戻るボタン ---
    if (i.customId === 'btn_back') {
      currentMode = 'main';
      await i.update({ embeds: [generateEmbed()], components: generateComponents() });
    }

    // --- ✨ 完成して出力 ---
    if (i.customId === 'btn_finish') {
      const finalResultText = `『コース名：${courseName}』\n\n` +
        `【楽曲名（ULTIMAもOK）】\n` +
        `１．${songs[0].name}［${songs[0].diff}］\n` +
        `２．${songs[1].name}［${songs[1].diff}］\n` +
        `３．${songs[2].name}［${songs[2].diff}］\n\n` +
        `【ルール】\n` +
        `LIFE:［${rule.life}］\n` +
        `RULE:［${rule.type}］で LIFE -1`;

      // パネルを確定状態（ボタン全消し）にする
      await i.update({ embeds: [generateEmbed()], components: [] });
      
      // テンプレートをテキストとして送信（コピペしやすいように）
      await i.followUp({ content: `**✅ コース設定が完了しました！以下のテキストをコピーして使用してください。**\n\`\`\`\n${finalResultText}\n\`\`\`` });
      
      collector.stop(); // 待機終了
    }
  });
}
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
