import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';

const foldersPath = path.join(process.cwd(), 'commands');
const commandFolders = fs.readdirSync(foldersPath);

export default async () => {
  // 呼び出しのたびに作り直す（モジュール直下に貯めると再呼び出しで重複するため）
  const commands = [];

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.mjs'));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const module = await import(filePath);
      // data が無いファイルは全体を落とさずスキップする（main.mjs 側と挙動を揃える）
      if (!module.data || typeof module.data.toJSON !== 'function') {
        console.error(`[警告] ${file} の登録をスキップしました (export const data がありません)`);
        continue;
      }
      commands.push(module.data.toJSON());
    }
  }

  const rest = new REST().setToken(process.env.TOKEN);

  try {
    console.log(`[INIT] ${commands.length}つのスラッシュコマンドを更新します。`);

    // グローバルコマンドとして1回だけ登録する
    // （以前は同じ PUT が2回あり、2回目は全く同じ内容を上書きしていました）
    await rest.put(
      Routes.applicationCommands(process.env.APPLICATION_ID),
      { body: commands },
    );

    console.log(`[INIT] ${commands.length}つのスラッシュコマンドを更新しました。`);
  } catch (error) {
    console.error(error);
  }
};
