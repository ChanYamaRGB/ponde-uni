import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-gacha')
  .setDescription('ランダムに選曲します！（2025/05/21現在）');

export async function execute(interaction) {
  // おみくじデータ定義
  const gachaData = {
  ソート: ["ジャンル順", "楽曲名順", "追加日順", "LEVEL順", "SCORE順", "AJ/FC順", "クリアマーク順", "FULL CHAIN順"],
  ジャンル: ["POPS&ANIME", "niconico", "東方Project", "VARIETY", "イロドリミドリ", "ゲキマイ", "ORIGINAL"],
  曲目: {
    "POPS&ANIME": 144,
    "niconico": 288,
    "東方Project": 146,
    "VARIETY": 231,
    "イロドリミドリ": 100,
    "ゲキマイ": 168,
    "ORIGINAL": 391
  },
  難易度: ["EXPERT", "MASTER", "ULTIMA（無ければ MASTER）"]
};

  // ソートをランダムに選出
const sortChoices = gachaData.ソート;
const sortResult = sortChoices[Math.floor(Math.random() * sortChoices.length)];
  
  // ジャンルをランダムに選出
const genreChoices = gachaData.ジャンル;
const genreResult = genreChoices[Math.floor(Math.random() * genreChoices.length)];

// 曲目を取得してランダムな数字を出す
const trackMax = gachaData.曲目[genreResult];
const trackResult = `${Math.floor(Math.random() * trackMax) + 1}`;

// 難易度は固定の配列から選出
const diffChoices = gachaData.難易度;
const diffResult = diffChoices[Math.floor(Math.random() * diffChoices.length)];
  // Embed作成
  const embed = new EmbedBuilder()
    .setTitle('🎲 選曲結果（カテゴリはジャンル）')
    .addFields(
      { name: 'ソート', value: sortResult, inline: true },
      { name: 'ジャンル', value: genreResult, inline: true },
      { name: '曲目', value: trackResult, inline: true },
      { name: '難易度', value: diffResult, inline: true }
    )
    .setColor(0xFDD500)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
