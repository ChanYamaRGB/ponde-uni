export default async function(interaction) {
  // ▼ 1. 通常のスラッシュコマンド実行時の処理
  if (interaction.isChatInputCommand()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
      } else {
        await interaction.reply({ content: 'コマンド実行中にエラーが発生しました。', ephemeral: true });
      }
    }
  } 
  
  // ▼ 2. ここを追加！ オートコンプリート入力時の処理
  else if (interaction.isAutocomplete()) {
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      // コマンドファイル内の autocomplete() 関数を呼び出す
      await command.autocomplete(interaction);
    } catch (error) {
      console.error('オートコンプリート処理中にエラーが発生しました:', error);
    }
  }
}
