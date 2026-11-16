import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import songsData from '../../utils/DB/songs.mjs';

export const data = new SlashCommandBuilder()
  .setName('uni-gacha')
  .setDescription('ランダムに選曲します！');

// ジャンル名は songs.mjs のキー順（0〜6）に対応する
const GENRES = ["POPS&ANIME", "niconico", "東方Project", "VARIETY", "イロドリミドリ", "ゲキマイ", "ORIGINAL"];

export async function execute(interaction) {
  // 曲数は songs.mjs の実データから数える
  // （以前は 2025/05/21 時点の曲数を手書きしていたため、楽曲追加に追随できなかった）
  const gachaData = {
  ソート: ["ジャンル順", "楽曲名順", "追加日順", "LEVEL順", "SCORE順", "AJ/FC順", "クリアマーク順", "FULL CHAIN順"],
  ジャンル: GENRES,
  曲目: Object.fromEntries(
    GENRES.map((genre, i) => [genre, (songsData[i] ?? []).length])
  ),
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
