import Command from "../../../base/Command.js";
import { cooldown } from "../../../functions/Cooldown/Cooldown.js";

export default class PingCommand extends Command {
    constructor(client) {
        super(client, {
            name: "ping",
            description: "Pong!?",
        });

        this.config = {
            ephemeral: false,
            autoDefer: false,
            requireDatabase: false,
        };
    } 

    run(interaction) {

        const hasCooldown = cooldown.has(interaction.user.id);

        if (hasCooldown) {
            return interaction.reply({ content: `Calma vidóco! Você está em cooldown de ${cooldown.left(interaction.user.id, 'texto')}.` })
        } else {
            interaction.reply({ content: `Pong!? ${this.client.ws.ping} ms` });
            cooldown.set(interaction.user.id, { segundos: 10 });
        }
    }
}