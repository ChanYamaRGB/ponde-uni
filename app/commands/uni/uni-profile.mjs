import {
  SlashCommandBuilder,
  AttachmentBuilder
} from "discord.js";
import { loadImage } from "@napi-rs/canvas";

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
        o.setName("battle-rank").setDescription("BATTLE RANK（例: S3、C3）")
          .setMinLength(2).setMaxLength(2)
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
    await interaction.deferReply();

    const target = interaction.options.getUser("user") ?? interaction.user;
    let member = null;
    if (interaction.guild) {
      member = await interaction.guild.members.fetch(target.id).catch(() => null);
    }

    const profile = await getProfile(interaction.client, target.id);
    const name = profile.name ?? member?.displayName ?? target.username;
    const avatarImage = await fetchAvatarImage(member ?? target);
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

    const battleRank = interaction.options.getString("battle-rank");
    if (battleRank !== null) {
      if (!/^[A-Ea-eSs][1-5]$/.test(battleRank)) {
        errors.push("BATTLE RANK は「S3」「C3」のように、英字1文字＋数字1文字で指定してください");
      } else {
        patch.battleRank = battleRank.toUpperCase();
        summary.push(`BATTLE RANK: ${patch.battleRank}`);
      }
    }

    const classEmblem = interaction.options.getString("class-emblem");
    if (classEmblem !== null) {
      patch.classEmblem = classEmblem === "none" ? null : Number(classEmblem);
      summary.push(`クラスエンブレム: ${classEmblem === "none" ? "なし" : `クラス${classEmblem}`}`);
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
    const avatarImage = await fetchAvatarImage(interaction.member ?? interaction.user);
    const buffer = await createProfileCard(profile, displayName, avatarImage);

    return interaction.editReply({
      content: `プロフィールを更新しました\n${summary.map((s) => `・${s}`).join("\n")}`,
      files: [new AttachmentBuilder(buffer, { name: "profile.png" })]
    });
  }
}
