import { ActivityType } from 'discord.js';
import Event from '../../../base/Event.js';
import { dbConnection } from "../../../containers/ThisCode.js";
import { setDescription } from '../../../functions/Others/Description.js';
const connection = await dbConnection();

export default class ReadyEvent extends Event {
    constructor() {
        super({ name: 'ready' });
    }

    async run(client) {
        console.log(`Olá, me chamo ${client.user.username} e estou ligado.`);
        client.application.commands.set(client.commands);

        let activities = [
            `Palaze Group`,
        ],
            i = 0;

        setInterval(() => {
            client.user.setActivity({
                name: `${activities[i++ % activities.length]}`,
                type: ActivityType.Playing
            });
        }, 5000);

        await setDescription(client);
    }
}
