import { trackReactionRemove } from '../utils/profile-store.mjs';

export default async function(reaction, user) {
  // プロフィールカード用の集計（OVER POWER）から、外されたリアクション分を差し引く。
  // trackReactionRemove 内で例外は握っているため、他の処理には影響しない。
  await trackReactionRemove(reaction, user);
}
