import { trackReactionAdd } from '../utils/profile-store.mjs';

export default async function(reaction, user) {
  // プロフィールカード用の集計（OVER POWER）へ、付けられたリアクションを反映する。
  // trackReactionAdd 内で例外は握っているため、他の処理には影響しない。
  await trackReactionAdd(reaction, user);
}
