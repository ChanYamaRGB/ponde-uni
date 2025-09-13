import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-help')
  .setDescription('現在使えるコマンドを表示します');

export async function execute(interaction) {
  await interaction.reply({
    content: `
**/uni-emoji-count**
-# 指定した年月のカスタム絵文字使用回数のトップ10（昇順と降順）
-# 表示までに１～２分かかります

**/uni-gacha**
-# ソート、ジャンル、曲目、難易度をランダムに選出
-# 更新頻度は低め

**/uni-intro**
-# 自己紹介をする際に使用されたテンプレート
-# 保存用

**/uni-string**
-# アルファベットを好きな字体に変えてくれる
-# コピペ目的のために一覧表示なし

**/uni-teamcource**
-# チームコースを作ってもらう際に使用されたテンプレート
-# 保存用
`,
    ephemeral: true
  });
}
