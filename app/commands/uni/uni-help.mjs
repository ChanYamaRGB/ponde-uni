import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-help')
  .setDescription('現在使えるコマンドを表示します');

export async function execute(interaction) {
  await interaction.reply({
    content: `
**/uni-emoji-count**
-# 指定年月のカスタム絵文字使用回数ランキング（昇順と降順）
-# 表示までに１～２分かかる

**/uni-gacha**
-# ソート、ジャンル、曲目、難易度から選曲
-# 更新頻度は低め

**/uni-intro**
-# 自己紹介テンプレート
-# 保存用

**/uni-score**
-# ユーザーにポイントを追加
-# 管理者のみ実行可能

**/uni-string**
-# アルファベットを好きな字体に変更
-# コピペ目的のため一覧表示なし

**/uni-teamcource**
-# チームコース作成テンプレート
-# 保存用

-# （2025.09.13 現在）
`,
    ephemeral: true
  });
}
