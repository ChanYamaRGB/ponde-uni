import fs from "fs";
import path from "path";
import express from "express";
import { Client, Collection, GatewayIntentBits, ActivityType } from "discord.js";
import CommandsRegister from "./regist-commands.mjs";
import schedule_update from './utils/schedule-update.mjs';
import song_update from './utils/song-update.mjs';
import boostDates from './utils/boostDates.mjs';
import { updateEvents } from './utils/eventMessages.mjs';

// Koyeb等のヘルスチェック／常駐確認用にポートを開けるだけのサーバー。
// 以前あった「POSTが10回届いたら trigger() を呼ぶ」処理は、trigger が
// 未定義でエラーになるため削除しました。
const app = express();
app.get('/', function(req, res) {
  res.send('ponde-uni bot is running.');
});
app.post('/', function(req, res) {
  res.send('POST response by GitHub');
});
app.listen(3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.commands = new Collection();
const handlers = new Map();

// コマンドをすべて読み込み終えてから次へ進む（起動直後の競合を防ぐ）
async function loadCommands() {
  const categoryFoldersPath = path.join(process.cwd(), "commands");
  const commandFolders = fs.readdirSync(categoryFoldersPath);

  const jobs = [];
  for (const folder of commandFolders) {
    const commandsPath = path.join(categoryFoldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".mjs"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      jobs.push(
        import(filePath).then((module) => {
          // エラー回避用の安全対策
          if (!module.data || !module.data.name) {
            console.error(`[警告] ${file} の読み込みをスキップしました (export const data がありません)`);
            return;
          }
          client.commands.set(module.data.name, module);
        }).catch(err => {
          console.error(`[エラー] ${file} のインポート中にエラーが発生しました:`, err);
        })
      );
    }
  }

  await Promise.all(jobs);
  console.log(`[INIT] コマンドを ${client.commands.size} 件読み込みました`);
}

// ハンドラをすべて読み込み終えてから次へ進む
async function loadHandlers() {
  const handlersPath = path.join(process.cwd(), "handlers");
  const handlerFiles = fs.readdirSync(handlersPath).filter((file) => file.endsWith(".mjs"));

  await Promise.all(handlerFiles.map(async (file) => {
    const filePath = path.join(handlersPath, file);
    const module = await import(filePath);
    handlers.set(file.slice(0, -4), module);
  }));
  console.log(`[INIT] ハンドラを ${handlers.size} 件読み込みました`);
}

client.on("interactionCreate", async (interaction) => {
  const handler = handlers.get("interactionCreate");
  if (!handler) {
    console.error("[エラー] interactionCreate ハンドラが読み込まれていません");
    return;
  }
  try {
    await handler.default(interaction);
  } catch (err) {
    console.error("[エラー] interactionCreate の処理中にエラーが発生しました:", err);
  }
});

client.on("messageCreate", async (message) => {
  if (!client.user || message.author.id == client.user.id || message.author.bot) return;
  const handler = handlers.get("messageCreate");
  if (!handler) {
    console.error("[エラー] messageCreate ハンドラが読み込まれていません");
    return;
  }
  try {
    await handler.default(message);
  } catch (err) {
    console.error("[エラー] messageCreate の処理中にエラーが発生しました:", err);
  }
});

client.on("messageDelete", async (message) => {
  const handler = handlers.get("messageDelete");
  if (!handler) {
    console.error("[エラー] messageDelete ハンドラが読み込まれていません");
    return;
  }
  try {
    await handler.default(message);
  } catch (err) {
    console.error("[エラー] messageDelete の処理中にエラーが発生しました:", err);
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  const handler = handlers.get("messageReactionAdd");
  if (!handler) {
    console.error("[エラー] messageReactionAdd ハンドラが読み込まれていません");
    return;
  }
  try {
    await handler.default(reaction, user);
  } catch (err) {
    console.error("[エラー] messageReactionAdd の処理中にエラーが発生しました:", err);
  }
});

client.on("messageReactionRemove", async (reaction, user) => {
  const handler = handlers.get("messageReactionRemove");
  if (!handler) {
    console.error("[エラー] messageReactionRemove ハンドラが読み込まれていません");
    return;
  }
  try {
    await handler.default(reaction, user);
  } catch (err) {
    console.error("[エラー] messageReactionRemove の処理中にエラーが発生しました:", err);
  }
});

function updatePresence() {
  if (!client.user) return;
  const guildCount = client.guilds.cache.size;

  client.user.setPresence({
    activities: [
      {
        name: `in ${guildCount} server`,
        type: ActivityType.Watching
      }
    ],
    status: "online"
  });
}

client.on("ready", async () => {
  console.log(`${client.user.tag} がログインしました！`);
  console.log(`BotがいるGuild一覧:`);
  client.guilds.cache.forEach(g => console.log(`- ${g.name} (ID: ${g.id})`));

  updatePresence();

  await boostDates(client);
  await schedule_update(client);
  await song_update(client, true);
  await updateEvents(client);
  setInterval(async () => {
    await updateEvents(client);
  }, 10 * 60 * 1000);
});

client.on("guildCreate", updatePresence);
client.on("guildDelete", updatePresence);

// 起動: 読み込み → コマンド登録 → ログイン の順に、終わるまで待つ
async function start() {
  if (!process.env.TOKEN) {
    console.error("[エラー] 環境変数 TOKEN が設定されていません。起動を中止します。");
    process.exit(1);
  }

  await loadCommands();
  await loadHandlers();

  if (process.env.APPLICATION_ID) {
    await CommandsRegister();
  } else {
    console.warn("[警告] 環境変数 APPLICATION_ID が未設定のため、スラッシュコマンドの登録をスキップします");
  }

  await client.login(process.env.TOKEN);
}

start().catch((err) => {
  console.error("[エラー] 起動に失敗しました:", err);
  process.exit(1);
});
