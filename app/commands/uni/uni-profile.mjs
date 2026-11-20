import {
  SlashCommandBuilder,
  AttachmentBuilder,
  PermissionFlagsBits
} from "discord.js";
import { loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// 公式サイト（chunithm.sega.jp）のキャラクターカタログ。アバター選択用
const charaCatalog = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "chara-catalog.json"), "utf8")
);
const charaCatalogMap = new Map(charaCatalog.map((e) => [e.key, e]));
const CHARA_IMAGE_BASE = "https://chunithm.sega.jp/storage/chara";

import {
  getProfile,
  updateProfile
} from "../../utils/profile-store.mjs";
import {
  createProfileCard,
  textUnits,
  TEXT_MAX_UNITS,
  playerNameError,
  TEAM_NAME_MAX_CHARS,
  BACKGROUND_VARIANTS,
  CHARA_BG_VARIANTS,
  TEAM_COLOR_VARIANTS,
  HONOR_COLOR_VARIANTS
} from "../../utils/profile-card.mjs";

function addChoices(option, variants) {
  return option.addChoices(...variants.map((v) => ({ name: v.label, value: v.value })));
}

function variantLabel(variants, value) {
  return variants.find((v) => v.value === value)?.label ?? value;
}

async function fetchAvatarImage(userOrMember) {
  try {
    const url = userOrMember.displayAvatarURL({ extension: "png", size: 256 });
    const res = await fetch(url);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

// キャラクターのサムネイル画像（アバター用）を公式サイトから取得する
async function fetchCharaAvatarImage(key) {
  if (!charaCatalogMap.has(key)) return null;
  const [page, id] = key.split("/");
  try {
    const res = await fetch(`${CHARA_IMAGE_BASE}/${page}/thumbnail/${id}.webp`);
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

// キャラクターアバターが設定されていればそれを使い、
// 未設定・取得失敗の場合は Discord のアバターを使う
async function resolveAvatarImage(profile, userOrMember) {
  if (profile.avatar) {
    const chara = await fetchCharaAvatarImage(profile.avatar);
    if (chara) return chara;
  }
  return fetchAvatarImage(userOrMember);
}

export const data = new SlashCommandBuilder()
  .setName("uni-profile")
  .setDescription("カスタムプロフィールカード")

  // ===== show =====
  .addSubcommand((sub) =>
    sub
      .setName("show")
      .setDescription("プロフィールカードを表示")
      .addUserOption((o) =>
        o.setName("user").setDescription("対象ユーザー（省略時は自分）")
      )
  )

  // ===== set =====
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("自分のプロフィールカードをカスタマイズ")
      .addStringOption((o) =>
        o.setName("name").setDescription("名前（8文字まで、英字・記号は全角のみ。省略時はサーバーでの表示名）")
          .setMinLength(1).setMaxLength(8)
      )
      .addStringOption((o) =>
        o.setName("honor-text").setDescription("称号1の文字（- でクリア）")
          .setMinLength(1).setMaxLength(32)
      )
      .addStringOption((o) =>
        addChoices(o.setName("honor-color").setDescription("称号1の色"), HONOR_COLOR_VARIANTS)
      )
      .addStringOption((o) =>
        o.setName("honor2-text").setDescription("称号2の文字（- でクリア）")
          .setMinLength(1).setMaxLength(32)
      )
      .addStringOption((o) =>
        addChoices(o.setName("honor2-color").setDescription("称号2の色"), HONOR_COLOR_VARIANTS)
      )
      .addStringOption((o) =>
        o.setName("honor3-text").setDescription("称号3の文字（- でクリア）")
          .setMinLength(1).setMaxLength(32)
      )
      .addStringOption((o) =>
        addChoices(o.setName("honor3-color").setDescription("称号3の色"), HONOR_COLOR_VARIANTS)
      )
      .addStringOption((o) =>
        o.setName("team-name").setDescription("チーム名（18文字まで）")
          .setMinLength(1).setMaxLength(18)
      )
      .addStringOption((o) =>
        addChoices(o.setName("team-color").setDescription("チームの色"), TEAM_COLOR_VARIANTS)
      )
      .addStringOption((o) =>
        addChoices(o.setName("chara-bg").setDescription("キャラクター背景"), CHARA_BG_VARIANTS)
      )
      .addStringOption((o) =>
        addChoices(o.setName("background").setDescription("プロフィール全体の背景"), BACKGROUND_VARIANTS)
      )
      .addStringOption((o) =>
        o.setName("battle-rank").setDescription("BATTLE RANK の帯")
          .addChoices(
            { name: "D", value: "D" },
            { name: "C", value: "C" },
            { name: "B", value: "B" },
            { name: "A", value: "A" },
            { name: "S", value: "S" },
            { name: "SS", value: "SS" },
            { name: "燦（SUN）", value: "燦" },
            { name: "煌（LUMINOUS）", value: "煌" },
            { name: "想（VERSE）", value: "想" },
            { name: "盟（Mate）", value: "盟" },
            { name: "エリート", value: "エリート" }
          )
      )
      .addStringOption((o) =>
        o.setName("battle-rank-number").setDescription("BATTLE RANK の数字（エリートには不要）")
          .addChoices(
            { name: "1", value: "1" },
            { name: "2", value: "2" },
            { name: "3", value: "3" }
          )
      )
      .addStringOption((o) =>
        o.setName("class-emblem").setDescription("クラスエンブレム")
          .addChoices(
            { name: "なし", value: "none" },
            { name: "クラス1", value: "1" },
            { name: "クラス2", value: "2" },
            { name: "クラス3", value: "3" },
            { name: "クラス4", value: "4" },
            { name: "クラス5", value: "5" },
            { name: "クラス6", value: "6" }
          )
      )
      .addStringOption((o) =>
        o.setName("avatar").setDescription("アバターにするキャラクター（名前の一部を入力して候補から選択）")
          .setAutocomplete(true)
      )
      .addNumberOption((o) =>
        o.setName("rating").setDescription("RATING")
          .setMinValue(0).setMaxValue(18)
      )
      .addNumberOption((o) =>
        o.setName("rating-max").setDescription("RATING の MAX")
          .setMinValue(0).setMaxValue(18)
      )
      .addNumberOption((o) =>
        o.setName("over-power").setDescription("OVER POWER")
          .setMinValue(0)
      )
      .addNumberOption((o) =>
        o.setName("over-power-percent").setDescription("OVER POWER の達成率（%）")
          .setMinValue(0).setMaxValue(100)
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // ===== show =====
  if (sub === "show") {
    const target = interaction.options.getUser("user") ?? interaction.user;

    // 他のユーザーを指定できるのは管理者権限を持ったユーザーのみ
    if (target.id !== interaction.user.id &&
        !interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "他のユーザーのプロフィールを表示できるのは、管理者権限を持ったユーザーのみです",
        ephemeral: true
      });
    }

    await interaction.deferReply();
    let member = null;
    if (interaction.guild) {
      member = await interaction.guild.members.fetch(target.id).catch(() => null);
    }

    const profile = await getProfile(interaction.client, target.id);
    const name = profile.name ?? member?.displayName ?? target.username;
    const avatarImage = await resolveAvatarImage(profile, member ?? target);
    const buffer = await createProfileCard(profile, name, avatarImage);

    return interaction.editReply({
      files: [new AttachmentBuilder(buffer, { name: "profile.png" })]
    });
  }

  // ===== set =====
  if (sub === "set") {
    const patch = {};
    const summary = [];
    const errors = [];

    const name = interaction.options.getString("name");
    if (name !== null) {
      const nameError = playerNameError(name);
      if (nameError) {
        errors.push(nameError);
      } else {
        patch.name = name;
        summary.push(`名前: ${name}`);
      }
    }

    // 称号は最大3つ。各スロットの文字と色を個別に変更できる
    const honorInputs = [
      { text: interaction.options.getString("honor-text"), color: interaction.options.getString("honor-color") },
      { text: interaction.options.getString("honor2-text"), color: interaction.options.getString("honor2-color") },
      { text: interaction.options.getString("honor3-text"), color: interaction.options.getString("honor3-color") }
    ];
    if (honorInputs.some((h) => h.text !== null || h.color !== null)) {
      const current = await getProfile(interaction.client, interaction.user.id);
      const honors = current.honors.map((h) => ({ ...h }));
      honorInputs.forEach((input, i) => {
        if (input.text !== null) {
          if (input.text === "-") {
            honors[i].text = null;
            summary.push(`称号${i + 1}: クリア`);
          } else if (textUnits(input.text) > TEXT_MAX_UNITS) {
            errors.push(`称号${i + 1}の文字は全角${TEXT_MAX_UNITS}文字相当までです（見切れ防止のため）`);
          } else {
            honors[i].text = input.text;
            summary.push(`称号${i + 1}の文字: ${input.text}`);
          }
        }
        if (input.color !== null) {
          honors[i].color = input.color;
          summary.push(`称号${i + 1}の色: ${variantLabel(HONOR_COLOR_VARIANTS, input.color)}`);
        }
      });
      patch.honors = honors;
    }

    const teamName = interaction.options.getString("team-name");
    if (teamName !== null) {
      if ([...teamName].length > TEAM_NAME_MAX_CHARS) {
        errors.push(`チーム名は${TEAM_NAME_MAX_CHARS}文字までです`);
      } else {
        patch.teamName = teamName;
        summary.push(`チーム名: ${teamName}`);
      }
    }

    const teamColor = interaction.options.getString("team-color");
    if (teamColor !== null) {
      patch.teamColor = teamColor;
      summary.push(`チームの色: ${variantLabel(TEAM_COLOR_VARIANTS, teamColor)}`);
    }

    const charaBg = interaction.options.getString("chara-bg");
    if (charaBg !== null) {
      patch.charaBg = charaBg;
      summary.push(`キャラクター背景: ${variantLabel(CHARA_BG_VARIANTS, charaBg)}`);
    }

    const background = interaction.options.getString("background");
    if (background !== null) {
      patch.background = background;
      summary.push(`背景: ${variantLabel(BACKGROUND_VARIANTS, background)}`);
    }

    // BATTLE RANK は帯と数字の選択式。片方だけの指定では、もう片方は現在の値を引き継ぐ
    const rankBand = interaction.options.getString("battle-rank");
    const rankNumber = interaction.options.getString("battle-rank-number");
    if (rankBand !== null || rankNumber !== null) {
      if (rankBand === "エリート") {
        patch.battleRank = "エリート";
        summary.push("BATTLE RANK: エリート");
      } else {
        const current = await getProfile(interaction.client, interaction.user.id);
        const currentRank = current.battleRank || "C3";
        const currentBand = currentRank.replace(/[0-9]/g, "");
        const band = rankBand
          ?? (["D", "C", "B", "A", "S", "SS", "燦", "煌", "想", "盟"].includes(currentBand) ? currentBand : "C");
        const number = rankNumber ?? currentRank.match(/[1-3]/)?.[0] ?? "3";
        patch.battleRank = `${band}${number}`;
        summary.push(`BATTLE RANK: ${patch.battleRank}`);
      }
    }

    const classEmblem = interaction.options.getString("class-emblem");
    if (classEmblem !== null) {
      patch.classEmblem = classEmblem === "none" ? null : Number(classEmblem);
      summary.push(`クラスエンブレム: ${classEmblem === "none" ? "なし" : `クラス${classEmblem}`}`);
    }

    const avatar = interaction.options.getString("avatar");
    if (avatar !== null) {
      if (avatar === "discord") {
        patch.avatar = null;
        summary.push("アバター: Discordのアバター");
      } else if (charaCatalogMap.has(avatar)) {
        patch.avatar = avatar;
        summary.push(`アバター: ${charaCatalogMap.get(avatar).name}`);
      } else {
        errors.push("アバターのキャラクターは、名前の一部を入力して候補から選んでください");
      }
    }

    const rating = interaction.options.getNumber("rating");
    if (rating !== null) {
      patch.rating = Math.round(rating * 100) / 100;
      summary.push(`RATING: ${patch.rating.toFixed(2)}`);
    }

    const ratingMax = interaction.options.getNumber("rating-max");
    if (ratingMax !== null) {
      patch.ratingMax = Math.round(ratingMax * 100) / 100;
      summary.push(`RATING (MAX): ${patch.ratingMax.toFixed(2)}`);
    }

    const overPower = interaction.options.getNumber("over-power");
    if (overPower !== null) {
      patch.overPower = Math.round(overPower * 100) / 100;
      summary.push(`OVER POWER: ${patch.overPower.toFixed(2)}`);
    }

    const overPowerPercent = interaction.options.getNumber("over-power-percent");
    if (overPowerPercent !== null) {
      patch.overPowerPercent = Math.round(overPowerPercent * 100) / 100;
      summary.push(`OVER POWER 達成率: ${patch.overPowerPercent.toFixed(2)}%`);
    }

    if (errors.length > 0) {
      return interaction.reply({ content: errors.join("\n"), ephemeral: true });
    }
    if (Object.keys(patch).length === 0) {
      return interaction.reply({
        content: "変更する項目を1つ以上指定してください",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const profile = await updateProfile(interaction.client, interaction.user.id, patch);
    const displayName = profile.name ?? interaction.member?.displayName ?? interaction.user.username;
    const avatarImage = await resolveAvatarImage(profile, interaction.member ?? interaction.user);
    const buffer = await createProfileCard(profile, displayName, avatarImage);

    return interaction.editReply({
      content: `プロフィールを更新しました\n${summary.map((s) => `・${s}`).join("\n")}`,
      files: [new AttachmentBuilder(buffer, { name: "profile.png" })]
    });
  }
}

// アバター選択のオートコンプリート（キャラクター名の一部で検索）
export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "avatar") return interaction.respond([]);
  const q = String(focused.value ?? "").replace(/\s+/g, "");
  const choices = [];
  if (q === "" || "Discordのアバターに戻す".includes(q)) {
    choices.push({ name: "Discordのアバターに戻す", value: "discord" });
  }
  for (const entry of charaCatalog) {
    if (choices.length >= 25) break;
    if (entry.name.replace(/\s+/g, "").includes(q) || entry.key.includes(q)) {
      choices.push({ name: `${entry.name}（${entry.series}）`.slice(0, 100), value: entry.key });
    }
  }
  return interaction.respond(choices.slice(0, 25));
}
