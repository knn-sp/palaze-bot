import { StringSelectMenuBuilder, ActionRowBuilder } from "discord.js";

export function createMenu(options) {
    const {
        customId,
        placeholder,
        minValues,
        maxValues,
        options: menuOptions,
        defaultValue
    } = options;

    const selectMenu = new StringSelectMenuBuilder();

    if (customId) selectMenu.setCustomId(customId);
    if (placeholder) selectMenu.setPlaceholder(placeholder);
    if (minValues) selectMenu.setMinValues(minValues);
    if (maxValues) selectMenu.setMaxValues(maxValues);
    if (menuOptions && menuOptions.length > 0) {
        const selectOptions = [];
        menuOptions.forEach(option => {
            if (!option.label || !option.value) return;
            const selectOption = {
                label: option.label,
                value: option.value
            };
            if (option.description) selectOption.description = option.description;
            if (option.emoji) selectOption.emoji = option.emoji;
            selectOptions.push(selectOption);
        });
        if (selectOptions.length > 0) selectMenu.addOptions(selectOptions);
    }
    if (defaultValue) {
        if (typeof defaultValue === 'string') selectMenu.setDefaultOption(defaultValue);
        else if (Array.isArray(defaultValue)) selectMenu.setDefaultOptions(defaultValue);
    }

    return selectMenu;
}

export function createRow(menus) {
    const row = new ActionRowBuilder();
    menus.forEach(menu => row.addComponents(menu));
    return row;
}