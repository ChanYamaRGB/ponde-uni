// import { kanji } from './kanjiList.mjs';
// import { kigou } from './kigouList.mjs';
// import { emojiId } from './emojiList.mjs';

// const targetChannelId = "1378769856777683124";

// export default async function(message) {
//   if (message.channel.id !== targetChannelId) return;

//   const content = message.content.trim();
  
//   const kanjiSet = new Set([...kanji]);
//   const kigouSet = new Set([...kigou]);
//   const emojiIdSet = new Set(emojiId);
//   const emojiMatch = content.match(/^<a?:\w+:(\d+)>$/);
//   const emojiSet = emojiMatch && emojiIdSet.has(emojiMatch[1]);

//   if (!emojiSet) {
//   for (const ch of content) {
//     if (
//       !kanjiSet.has(ch) &&
//       !kigouSet.has(ch) &&
//       ch !== '\n' &&
//       ch !== ' ' &&
//       ch !== '　'
//     ) {
//       try {
//         await message.delete();
//         console.log(`削除: "${ch}" を含むメッセージ`);
//       } catch (err) {
//         console.error("削除失敗:", err);
//       }
//       return;
//     }
//   }
//   }
// }
