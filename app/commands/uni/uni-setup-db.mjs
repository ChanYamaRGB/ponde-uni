import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('uni-setup-db')
        .setDescription('データベース用の初期メッセージを送信し、設定用IDを取得します。')
        // 管理者権限を持つユーザーのみ実行可能に設定（誤実行防止）
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // 初期状態の空JSONを送信
            const dbMessage = await interaction.channel.send('```json\n{}\n```');
            
            // 設定に必要なIDを実行者のみに見える形で返信
            await interaction.reply({
                content: `データベース用の初期メッセージを作成しました。\n以下の値をKoyebの環境変数（またはコード）に設定してください：\n\n**DB_CHANNEL_ID**: \`${interaction.channel.id}\`\n**DB_MESSAGE_ID**: \`${dbMessage.id}\``,
                ephemeral: true
            });
        } catch (error) {
            console.error('Koyeb Log: Setup command error.', error);
            await interaction.reply({
                content: 'メッセージの送信に失敗しました。ボットにこのチャンネルへの「メッセージ送信」権限があるか確認してください。',
                ephemeral: true
            });
        }
    }
};
