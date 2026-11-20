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
  )
  .addAttachmentOption(option =>
    option.setName('image')
      .setDescription('一緒に送信する画像（任意）')
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const targetUser = interaction.options.getUser('user');
  const content = interaction.options.getString('content');
  const imageAttachment = interaction.options.getAttachment('image');
  const channel = interaction.channel;

  try {
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const displayName = member ? member.displayName : targetUser.username;
    
    const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 1024 });

    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.owner.id === interaction.client.user.id);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: 'Uni-Message Webhook',
      });
    }

    // ▼ ここで sendOptions を定義して送信データをまとめます
    const sendOptions = {
      content: content,
      username: displayName,
      avatarURL: avatarURL,
    };

    // 画像が添付されていたら送信データにファイルを追加
    if (imageAttachment) {
      sendOptions.files = [imageAttachment.url];
    }

    // Webhook経由で送信
    await webhook.send(sendOptions);

    await interaction.deleteReply();

  } catch (error) {
    console.error('Webhook送信エラー:', error);
    await interaction.editReply({ 
      content: '❌ エラーが発生しました。\nBotのロールに**「Webhookの管理」**権限が付与されているか確認してください。' 
    });
  }
}
