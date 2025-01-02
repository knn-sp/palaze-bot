import { ActionRowBuilder, Attachment, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, ComponentType, EmbedBuilder, PermissionsBitField, StringSelectMenuBuilder } from "discord.js";
import Event from "../../../base/Event.js"
import { dbConnection } from "../../../containers/ThisCode.js";
const connection = await dbConnection();

export default class InteractionCreateEvent extends Event {
    constructor() {
        super({ name: 'interactionCreate' });
    }

    async run(client, interaction) {
        if (!interaction.isSelectMenu()) return;

        if (interaction.customId === "menu_example") {
			//Código aqui
        }
    }
}