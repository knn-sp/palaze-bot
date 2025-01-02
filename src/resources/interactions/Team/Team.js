import Command from "../../../base/Command.js";
import fs from "fs/promises";
import config from "../../config.json" with { type: 'json' };
import { JsonDatabase } from "wio.db";
import { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { formatDistanceToNow, parseISO } from 'date-fns';

const teamConfig = new JsonDatabase({ databasePath: "src/config/team.json" });

export default class TeamCommand extends Command {
    constructor(client) {
        super(client, {
            name: "team",
            description: "Visualize nossa equipe disponível",
            options: [
                {
                    name: "add",
                    description: "Adicione um novo membro no time",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "Selecione o usuário",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        },
                        {
                            name: "cargo",
                            description: "Selecione o cargo",
                            type: ApplicationCommandOptionType.Role,
                            required: true,
                        }
                    ]
                },
                {
                    name: "remove",
                    description: "Remova um membro do time",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "user",
                            description: "Selecione o usuário",
                            type: ApplicationCommandOptionType.User,
                            required: true,
                        }
                    ]
                },
                {
                    name: "list",
                    description: "Veja nossa equipe",
                    type: ApplicationCommandOptionType.Subcommand,
                }
            ]
        });

        this.config = {
            ephemeral: false,
            autoDefer: false,
            requireDatabase: false,
        };
    }

    async run(interaction) {
        if (!interaction.channel.permissionsFor(interaction.user).has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: `Você não possui permissão para isso!`,
                ephemeral: true,
            });
        }

        if (interaction.options.getSubcommand() === "list") {
            const embed = new EmbedBuilder()
                .setColor(config.color["no-clean"]);

            const teamMembers = await readTeamsConfig();

            if (!teamMembers || Object.keys(teamMembers).length === 0) {
                return interaction.reply({
                    content: "Ainda não houveram membros na equipe!",
                    ephemeral: true,
                });
            }

            let description = '';

            for (const [key, value] of Object.entries(teamMembers)) {
                let user = interaction.guild.members.cache.get(key);

                if (!user) {
                    try {
                        user = await interaction.guild.members.fetch(key);
                    } catch (error) {
                        console.error(`Erro ao buscar membro com ID ${key}:`, error);
                        continue;
                    }
                }

                if (user) {
                    const entryDate = parseISO(value.entryDate);
                    const formattedEntryDate = new Intl.DateTimeFormat('pt-BR', { 
                        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' 
                    }).format(entryDate);

                    const timeInTeam = formatDistanceToNow(entryDate, { addSuffix: true });

                    description += `<:p_:1312432398801305612> **${user.user.username}**\n` +
                        `<a:963940278991994900:993239526317228143> Cargo: <@&${value.roleId}>\n` +
                        `<a:963940279386243142:993239535519535234> Integrante desde **${formattedEntryDate}** \`(${timeInTeam})\`\n` +
                        `<:coffee:1012845784728879255> Status: \`${value.status}\`\n\n`;
                }
            }

            embed.setAuthor({
                name: `Palaze Group | Equipe`,
                iconURL: interaction.guild.iconURL()
            })
            embed.setDescription(description);

            return interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }

        if (interaction.options.getSubcommand() === "add") {
            const user = interaction.options.getUser("user");
            const role = interaction.options.getRole("cargo");

            const entryDate = new Date().toISOString();

            teamConfig.set(user.id, {
                roleId: role.id,
                entryDate,
                status: "Está disponível para um trabalho."
            });

            return interaction.reply({
                content: `O membro ${user} foi adicionado ao time com sucesso!`,
                ephemeral: true,
            });
        }

        else if (interaction.options.getSubcommand() === "remove") {
            const user = interaction.options.getUser("user");

            teamConfig.delete(user.id);

            return interaction.reply({
                content: `O membro ${user} foi removido do time com sucesso!`,
                ephemeral: true,
            });
        }
    }
}

async function readTeamsConfig() {
    try {
        const rawData = await fs.readFile('src/config/team.json', 'utf-8');
        const members = JSON.parse(rawData);
        return members;
    } catch (error) {
        console.error('Erro ao ler o arquivo de membros:', error.message);
        return {};
    }
}