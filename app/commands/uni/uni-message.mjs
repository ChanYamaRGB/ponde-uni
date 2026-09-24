import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('uni-message')
  .setDescription('指定したユーザーとしてメッセージを送信します')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('なりすますユーザーを選択')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('content')
      .setDescription('送信するメッセージ内容')
      .setRequired(true)
  );

export async function execute(interaction) {
  // コマンドの実行履歴を他の人に見せないようにするため、ephemeral（自分のみ表示）で待機
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user');
  const content = interaction.options.getString('content');
  const channel = interaction.channel;

  try {
    // 対象ユーザーのサーバー内でのニックネームを取得（取得できなければデフォルトのユーザー名）
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const displayName = member ? member.displayName : targetUser.username;
    
    // アイコンURLを取得
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 1024 });

    // チャンネル内の既存のWebhookを取得
    const webhooks = await channel.fetchWebhooks();
    // このBot自身が作成した使い回し用のWebhookを探す
    let webhook = webhooks.find(wh => wh.owner.id === interaction.client.user.id);

    // 見つからなければ新しく作成する
    if (!webhook) {
      webhook = await channel.createWebhook({
        name: 'Uni-Message Webhook',
      });
    }

    // Webhook経由でメッセージを送信（ここで名前とアイコンを対象ユーザーのものに一時的に上書きする）
    await webhook.send({
      content: content,
      username: displayName,
      avatarURL: avatarURL,
    });

    // 送信完了後、「考え中...」のメッセージを削除して何も残さないようにする
    await interaction.deleteReply();

  } catch (error) {
    console.error('Webhook送信エラー:', error);
    await interaction.editReply({ 
      content: '❌ エラーが発生しました。\nBotのロールに**「Webhookの管理」**権限が付与されているか確認してください。' 
    });
  }
}
