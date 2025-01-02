import { ActionRowBuilder, ButtonBuilder } from "discord.js";

export function createButton(options) {
    const {
        style,
        label,
        customId,
        disabled,
        emoji,
        url
    } = options;

    const button = new ButtonBuilder();

    if (style) button.setStyle(style);
    if (label) button.setLabel(label);
    if (customId) button.setCustomId(customId);
    if (disabled) button.setDisabled(disabled);
    if (emoji) button.setEmoji(emoji);
    if (url) button.setURL(url);
  
    return button;
}

export function createRow(buttons) {
    const row = new ActionRowBuilder();
    buttons.forEach(button => row.addComponents(button));
    return row;
}