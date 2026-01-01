import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// メッセージID保存先
const saveFile = path.join(__dirname, "DB", "boostMessage.json");

function loadData() {
  if (!fs.existsSync(saveFile)) {
    fs.writeFileSync(saveFile, "{}", "utf-8");
  }
  return JSON.parse(fs.readFileSync(saveFile, "utf-8"));
}

function saveData(data) {
  fs.writeFileSync(saveFile, JSON.stringify(data, null, 2));
}

export default function schedule_post(client) {

  const targetDates = [10, 17, 24, 31];
  const targetChannelId = "1155482638493171782";

  const postOrDelete = async () => {
    const now = new Date();
    const today = now.getDate();

    const data = loadData();

    const channel = await client.channels.fetch(targetChannelId);
    if (!channel || !channel.isTextBased()) return;

    /* ---------- 対象日：投稿 ---------- */
    if (targetDates.includes(today)) {
      // すでに投稿済みなら何もしない
      if (data.messageId) return;

      const msg = await channel.send({
        content: "# ブースト日です‼️",
        files: [
          "https://new.chunithm-net.com/chuni-mobile/html/mobile/images/team_boost_day_info.png"
        ]
      });

      data.messageId = msg.id;
      saveData(data);

      console.log("ブースト告知を投稿しました");
      return;
    }

    /* ---------- 対象日以外：削除 ---------- */
    if (data.messageId) {
      try {
        const oldMsg = await channel.messages.fetch(data.messageId);
        await oldMsg.delete();
        console.log("期限切れのブースト告知を削除しました");
      } catch {
        console.log("メッセージは既に削除されています");
      }

      delete data.messageId;
      saveData(data);
    }
  };

  const scheduleUpdate = () => {
    const now = new Date();
    const updateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      7, 0, 0
    );

    if (updateTime < now) {
      updateTime.setDate(updateTime.getDate() + 1);
    }

    const delay = updateTime - now;

    setTimeout(() => {
      postOrDelete();
      scheduleUpdate();
    }, delay);
  };

  scheduleUpdate();
}
