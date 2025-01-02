import Event from "../../../base/Event.js"
import { createEmbed } from "../../../functions/Embeds/CreateEmbed.js";
import { createMenu, createRow } from "../../../functions/Interactions/CreateSelectMenu.js";
import { createButton } from "../../../functions/Interactions/CreateButton.js";
import moment from "moment";
import { ActionRowBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, PermissionsBitField, TextInputBuilder, TextInputStyle } from "discord.js";
moment.locale('pt-br');
import { dbConnection } from "../../../containers/ThisCode.js";
const connection = await dbConnection();

export default class InteractionCreateEvent extends Event {
    constructor() {
        super({ name: 'interactionCreate' });
    }

    async run(client, interaction) {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === "modal_example") {
			// Código aqui
		}	
    }
}