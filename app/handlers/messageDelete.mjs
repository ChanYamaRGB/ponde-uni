import { untrackMessage } from '../utils/profile-store.mjs';

export default async function(message) {
  // プロフィールカード用の集計（OVER POWER）から、削除された投稿分を差し引く。
  // untrackMessage 内で例外は握っているため、他の処理には影響しない。
  await untrackMessage(message);
}
