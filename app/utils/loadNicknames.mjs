// utils/loadNicknames.mjs
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "commands/uni/data/nicknames.json");

export async function updateNicknames(client, guildId) {
  const guild = await client.guilds.fetch(guildId);
  const members = await guild.members.fetch({ withPresences: false });

  const map = {};
  for (const member of members.values()) {
    map[member.id] =
      member.nickname ?? member.user.username;
  }

  fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
  console.log("[NICK] nicknames.json を更新しました");
}
