import Event from "../../../base/Event.js"

export default class MessageCreateEvent extends Event {
    constructor() {
        super({ name: 'messageCreate' });
    }

    async run(client, message) {
        if (!message.author) return;

        if (message.author.id === client.user.id) return;

        if (message.channel.id === "1142103168688345300") {

            try {
                await message.delete();
            } catch (error) {
                console.log(error);
            }
            console.log(`Mensagem do usuário ${message.author.username} apagada.`);
        }
    }
}