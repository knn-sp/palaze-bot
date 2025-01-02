import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import Command from "../../../base/Command.js";

export default class ClearCommand extends Command {
    constructor(client) {
        super(client, {
            name: "clear",
            description: "Apague mensagens de um canal!",
            options: [
                {
                    name: "quantidade",
                    description: "O número de mensagens para apagar (máximo: 100)",
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                    choices: [
                        { name: "1", value: 1 },
                        { name: "2", value: 2 },
                        { name: "3", value: 3 },
                        { name: "4", value: 4 },
                        { name: "5", value: 5 },
                        { name: "10", value: 10 },
                        { name: "20", value: 20 },
                        { name: "30", value: 30 },
                        { name: "40", value: 40 },
                        { name: "50", value: 50 },
                        { name: "100", value: 100 },
                    ],
                },
            ],
        });

        this.config = {
            ephemeral: false,
            autoDefer: false,
            requireDatabase: false,
        };
    }

    async run(interaction) {
        if (!interaction.channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ADMINISTRATOR)) {
            return interaction.reply({
                content: `Você não possui permissão para isso!`,
                ephemeral: true,
            });
        }

        const amount = interaction.options.getInteger("quantidade");
        if (!amount || amount < 1 || amount > 100) {
            return interaction.reply({
                content: `Por favor, especifique um número de mensagens para apagar entre 1 e 100.`,
                ephemeral: true,
            });
        }

        const messages = await interaction.channel.messages.fetch({ limit: amount });

        const filteredMessages = messages.filter((message) => {
            const daysAgo = (Date.now() - message.createdAt.getTime()) / (1000 * 60 * 60 * 24); // Calcula a diferença em dias
            return daysAgo < 14; // Verifica se a mensagem tem menos de 14 dias
        });

        if (filteredMessages.size === 0) {
            return interaction.reply({
                content: "Não há mensagens recentes para excluir.",
                ephemeral: true,
            });
        }

        try {
            interaction.channel.bulkDelete(filteredMessages);
            return interaction.reply({
                content: `Apaguei ${filteredMessages.size} mensagens.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error("Erro ao excluir as mensagens:", error);
            return interaction.reply({
                content: "Ocorreu um erro ao excluir as mensagens.",
                ephemeral: true,
            });
        }
    }
}