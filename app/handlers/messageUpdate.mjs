// import { kanji } from './messageCreate/kanjiList.mjs';
// import { kigou } from './messageCreate/kigouList.mjs';
// import { emojiId } from './messageCreate/emojiList.mjs';

// const targetChannelId = "1378769856777683124";

// export default async function (oldMessage, newMessage) {
//   try {
//     if (!newMessage || newMessage.partial) {
//       newMessage = await newMessage.fetch().catch(err => {
//         console.error("partial message の取得に失敗:", err);
//         return null;
//       });
//     }

//     if (!newMessage || !newMessage.content || newMessage.author?.bot) return;

//     const content = newMessage.content.trim();

//     const kanjiSet = new Set([...kanji]);
//     const kigouSet = new Set([...kigou]);
//     const emojiIdSet = new Set(emojiId);
//     const emojiMatch = content.match(/^<a?:\w+:(\d+)>$/);
//     const emojiSet = emojiMatch && emojiIdSet.has(emojiMatch[1]);

//     if (!emojiSet) {
//       for (const ch of content) {
//         if (
//           !kanjiSet.has(ch) &&
//           !kigouSet.has(ch) &&
//           ch !== '\n' &&
//           ch !== ' ' &&
//           ch !== '　'
//         ) {
//           await newMessage.delete();
//           console.log(`編集削除: "${ch}" を含むメッセージ`);
//           return;
//         }
//       }
//     }
//   } catch (err) {
//     console.error("messageUpdate 処理中にエラー:", err);
//   }
// }
