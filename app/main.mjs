import fs from "fs";
import path from "path";
import express from "express";
import { Client, Collection, Events, GatewayIntentBits, ActivityType, EmbedBuilder } from "discord.js";
import CommandsRegister from "./regist-commands.mjs";
import schedule_update from './utils/schedule-update.mjs';
import song_update from './utils/song-update.mjs';
import boostDates from './utils/boostDates.mjs';
import { updateEvents } from './utils/eventMessages.mjs';

import Sequelize from "sequelize";
import Parser from 'rss-parser';
const parser = new Parser();

let postCount = 0;
const app = express();
app.listen(3000);
app.post('/', function(req, res) {
  console.log(`Received POST request.`);

  postCount++;
  if (postCount == 10) {
    trigger();
    postCount = 0;
  }

  res.send('POST response by GitHub');
})
app.get('/', function(req, res) {
  res.send('<a href="https://note.com/exteoi/n/n0ea64e258797</a> に解説があります。');
})

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

const categoryFoldersPath = path.join(process.cwd(), "commands");
const commandFolders = fs.readdirSync(categoryFoldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(categoryFoldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".mjs"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    import(filePath).then((module) => {
      client.commands.set(module.data.name, module);
    });
  }
}

const handlers = new Map();

const handlersPath = path.join(process.cwd(), "handlers");
const handlerFiles = fs.readdirSync(handlersPath).filter((file) => file.endsWith(".mjs"));

for (const file of handlerFiles) {
  const filePath = path.join(handlersPath, file);
  import(filePath).then((module) => {
    handlers.set(file.slice(0, -4), module);
  });
}

client.on("interactionCreate", async (interaction) => {
  await handlers.get("interactionCreate").default(interaction);
});

client.on("messageCreate", async (message) => {
  if (message.author.id == client.user.id || message.author.bot) return;
  await handlers.get("messageCreate").default(message);
});

function updatePresence() {
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

CommandsRegister();
client.login(process.env.TOKEN);
