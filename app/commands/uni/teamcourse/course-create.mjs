import {
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from "discord.js";

export const data = new SlashCommandBuilder()
    .setName("course")
    .setDescription("チームコースを作成")

    .addSubcommand(sub =>
        sub
            .setName("create")
            .setDescription("チームコース作成")
    );

export async function execute(interaction) {

    const sub = interaction.options.getSubcommand();

    if (sub !== "create") return;

    const modal = new ModalBuilder()
        .setCustomId("course_name_modal")
        .setTitle("チームコース作成");

    const input = new TextInputBuilder()
        .setCustomId("course_name")
        .setLabel("コース名")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(40);

    modal.addComponents(
        new ActionRowBuilder().addComponents(input)
    );

    await interaction.showModal(modal);
}
