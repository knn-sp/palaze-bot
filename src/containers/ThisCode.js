import { Client, Collection } from "discord.js";
import { readdir } from 'node:fs/promises';
import config from "../resources/config.json" with {type: 'json'};
import ClientOptions from './ClientOptions.js';
import { setTimeout as sleep } from 'node:timers/promises';
import mysql from "mysql2/promise"
import { createTables } from "../resources/database/models/CreateTicketTables.js";

const dbConfig = {
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
};

const pool = mysql.createPool(dbConfig);

export const dbConnection = async () => {
    if (!config.mysql.status) {
        return null;
    }

    if (ThisCode.dbConnection) {
        return ThisCode.dbConnection;
    }

    try {
        const connection = await pool.getConnection();
        console.log('Conexão bem-sucedida ao MySQL');
        createTables(connection);

        ThisCode.dbConnection = connection;

        return connection;
    } catch (error) {
        console.error('Erro na conexão ao MySQL: ' + error.message);
        return null;
    }
};

export default class ThisCode extends Client {
    constructor() {
        super(ClientOptions);

        this.commands = new Collection();
		this.dbConnection = null;
    }

    async loadCommands(client) {
        const categories = await readdir('./src/resources/interactions');

        for await (const category of categories) {
            const commands = await readdir(`./src/resources/interactions/${category}`);

            for (const command of commands) {
                const { default: CommandClass } = await import(`../resources/interactions/${category}/${command}`);
                const cmd = new CommandClass(client);

                client.commands.set(cmd.name, cmd);
            }
        }
    }

    async loadEvents(client) {
		const categories = await readdir('./src/resources/events');

		for await (const category of categories) {
			const events = await readdir(`./src/resources/events/${category}`);

			for (const event of events) {
				const { default: EventClass } = await import(`../resources/events/${category}/${event}`);
				const evt = new EventClass(client);

				client.on(evt.name, (...args) => evt.run(client, ...args));
			}
		}
	}

	async connect() {
		await sleep(1_000);
		this.dbConnection = await dbConnection();
		this.loadCommands(this);
		this.loadEvents(this);

		await sleep(2_500);
		super.login(config.token);
	}
}