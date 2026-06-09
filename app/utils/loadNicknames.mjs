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

async function createRankingImage(sorted, nicknames, guild) {

  const rowHeight = 40;
  const headerHeight = 60;

  const width = 900;
  const height =
    headerHeight +
    (sorted.length * rowHeight) +
    40;

  const canvas = createCanvas(
    width,
    height
  );

  const ctx = canvas.getContext("2d");

  // 背景
  ctx.fillStyle = "#2b2d31";
  ctx.fillRect(
    0,
    0,
    width,
    height
  );

  // タイトル
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";

  ctx.fillText(
    "🏆 貢献度ランキング",
    20,
    40
  );

  // ヘッダー
  ctx.font = "24px sans-serif";

  ctx.fillText("順位", 30, 90);
  ctx.fillText("ユーザー", 150, 90);
  ctx.fillText("累計", 650, 90);
  ctx.fillText("使用可能", 760, 90);

  ctx.strokeStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(20, 105);
  ctx.lineTo(width - 20, 105);
  ctx.stroke();

  let rank = 1;

  for (const { data } of sorted) {

    let displayName =
      nicknames[data.id];

    if (!displayName) {

      try {

        const member =
          await guild.members.fetch(data.id);

        displayName =
          member.nickname ??
          member.user.username;

      } catch {

        displayName = "Unknown";
      }
    }

    const y =
      140 +
      ((rank - 1) * rowHeight);

    let medal = "";

    if (rank === 1) medal = "🥇";
    else if (rank === 2) medal = "🥈";
    else if (rank === 3) medal = "🥉";

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px sans-serif";

    ctx.fillText(
      `${medal}${rank}`,
      30,
      y
    );

    ctx.fillText(
      displayName,
      150,
      y
    );

    ctx.fillText(
      String(data.points),
      650,
      y
    );

    ctx.fillText(
      String(data.usable),
      780,
      y
    );

    ctx.strokeStyle = "#444";

    ctx.beginPath();
    ctx.moveTo(20, y + 15);
    ctx.lineTo(width - 20, y + 15);
    ctx.stroke();

    rank++;
  }

  return canvas.encode("png");
}
