import { Client, GatewayIntentBits, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.commands = new Collection();

// 1. コマンドファイルの動的読み込み
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.mjs') || file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        // 【修正箇所】import用のURL文字列を生成（以前のコードで欠落していた部分）
        const fileUrl = pathToFileURL(filePath).href;

        const module = await import(fileUrl);
        const command = module.default;

        if (command && 'data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.warn(`[WARNING] Koyeb Log: ${file} に必要な "data" または "execute" がありません。`);
        }
    }
}

// 2. イベントハンドラーの動的読み込み
const handlersPath = path.join(__dirname, 'handlers');
// ディレクトリを除外し、ファイルのみをフィルタリング
const handlerFiles = fs.readdirSync(handlersPath).filter(file => !fs.statSync(path.join(handlersPath, file)).isDirectory() && (file.endsWith('.mjs') || file.endsWith('.js')));

for (const file of handlerFiles) {
    const filePath = path.join(handlersPath, file);
    // 【修正箇所】イベント側でも同様に fileUrl を定義
    const fileUrl = pathToFileURL(filePath).href;
    
    const module = await import(fileUrl);
    const event = module.default;

    if (event && event.name) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// 3. Botのログイン
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Koyeb Log: Discord Login Error', err);
});

// 4. Koyeb / UptimeRobot 監視維持用HTTPサーバー
const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running and awake!');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`Koyeb Log: Port ${PORT} is already in use. HTTP server logic skipped to prevent crash.`);
    } else {
        console.error('Koyeb Log: HTTP Server Error:', err);
    }
});

server.listen(PORT, () => {
    console.log(`Koyeb Log: HTTP Server listening on port ${PORT} for UptimeRobot.`);
});

// import fs from "fs";
// import path from "path";
// import express from "express";
// import { Client, Collection, Events, GatewayIntentBits, ActivityType, EmbedBuilder } from "discord.js";
// import CommandsRegister from "./regist-commands.mjs";
// import schedule_update from './utils/schedule-update.mjs';
// import song_update from './utils/song-update.mjs';
// import boostDates from './utils/boostDates.mjs';
// import { updateEvents } from './utils/eventMessages.mjs';

// import Sequelize from "sequelize";
// import Parser from 'rss-parser';
// const parser = new Parser();

// let postCount = 0;
// const app = express();
// app.listen(3000);
// app.post('/', function(req, res) {
//   console.log(`Received POST request.`);
  
//   postCount++;
//   if (postCount == 10) {
//     trigger();
//     postCount = 0;
//   }
  
//   res.send('POST response by GitHub');
// })
// app.get('/', function(req, res) {
//   res.send('<a href="https://note.com/exteoi/n/n0ea64e258797</a> に解説があります。');
// })

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//     GatewayIntentBits.GuildVoiceStates,
//   ],
// });

// client.commands = new Collection();

// const categoryFoldersPath = path.join(process.cwd(), "commands");
// const commandFolders = fs.readdirSync(categoryFoldersPath);

// for (const folder of commandFolders) {
//   const commandsPath = path.join(categoryFoldersPath, folder);
//   const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".mjs"));
  
//   for (const file of commandFiles) {
// const module = await import(fileUrl);
// const command = module.default; // .mjsのデフォルトエクスポートを取得

// if (command && 'data' in command && 'execute' in command) {
//     client.commands.set(command.data.name, command);
// } else {
//     console.warn(`[WARNING] Koyeb Log: ${file} に必要な "data" または "execute" がありません。`);
// }
//   }
// }

// const handlers = new Map();

// const handlersPath = path.join(process.cwd(), "handlers");
// const handlerFiles = fs.readdirSync(handlersPath).filter((file) => file.endsWith(".mjs"));

// for (const file of handlerFiles) {
//   const filePath = path.join(handlersPath, file);
//   import(filePath).then((module) => {
//     handlers.set(file.slice(0, -4), module);
//   });
// }

// client.on("interactionCreate", async (interaction) => {
//   await handlers.get("interactionCreate").default(interaction);
// });

// client.on("messageCreate", async (message) => {
//   if (message.author.id == client.user.id || message.author.bot) return;
//   await handlers.get("messageCreate").default(message);
// });

// function updatePresence() {
//   const guildCount = client.guilds.cache.size;

//   client.user.setPresence({
//     activities: [
//       {
//         name: `in ${guildCount} server`,
//         type: ActivityType.Watching
//       }
//     ],
//     status: "online"
//   });
// }

// client.on("ready", async () => {
//   console.log(`${client.user.tag} がログインしました！`);
//   console.log(`BotがいるGuild一覧:`);
//   client.guilds.cache.forEach(g => console.log(`- ${g.name} (ID: ${g.id})`));

//   updatePresence();

//   await boostDates(client);
//   await schedule_update(client);
//   await song_update(client, true);
//   await updateEvents(client);
//   setInterval(async () => {
//     await updateEvents(client);
//   }, 10 * 60 * 1000);
// });

// client.on("guildCreate", updatePresence);
// client.on("guildDelete", updatePresence);

// import http from 'http';

// // ポート番号は環境変数を優先し、フォールバックとして8080を指定
// const PORT = process.env.PORT || 8080;

// const server = http.createServer((req, res) => {
//     res.writeHead(200, { 'Content-Type': 'text/plain' });
//     res.end('Bot is running and awake!');
// });

// // EADDRINUSEエラーを捕捉し、Botプロセス全体のクラッシュを回避
// server.on('error', (err) => {
//     if (err.code === 'EADDRINUSE') {
//         console.warn(`Koyeb Log: Port ${PORT} is already in use. The HTTP server is likely already running in this container.`);
//     } else {
//         console.error('Koyeb Log: HTTP Server Error:', err);
//     }
// });

// server.listen(PORT, () => {
//     console.log(`Koyeb Log: HTTP Server listening on port ${PORT} for UptimeRobot.`);
// });
