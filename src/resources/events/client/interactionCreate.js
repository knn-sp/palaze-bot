import Event from "../../../base/Event.js"

export default class InteractionCreateEvent extends Event {
    constructor() {
        super({ name: 'interactionCreate' });
    }

    async run(client, interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        if (command.config.autoDefer) await interaction.deferReply({ ephemeral: command.config.ephemeral });

		command.run(interaction);
    }
}