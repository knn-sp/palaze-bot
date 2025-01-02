import Event from "../../../base/Event.js";
import config from "../../config.json" with {type: 'json'};
import moment from "moment";
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, ModalBuilder, PermissionsBitField, SelectMenuBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
moment.locale('pt-br');
import { dbConnection } from "../../../containers/ThisCode.js";
const connection = await dbConnection();
import Transcripts from "discord-html-transcripts";
import fs from "fs/promises";
import { JsonDatabase } from "wio.db";

const categoryConfig = new JsonDatabase({ databasePath: "src/config/categorys.json" });
const userTicketOpenedConfig = new JsonDatabase({ databasePath: "src/config/tickets_opened.json" });
const panelsConfig = new JsonDatabase({ databasePath: "src/config/panels.json" });

export default class InteractionCreateEvent extends Event {
    constructor() {
        super({ name: 'interactionCreate' });
    }

    async run(client, interaction) {
        if (!interaction.isButton()) return;

        const panels = await readPanelsConfig();
        const customId = interaction.customId;

        const parts = customId.split('-');

        if (parts.length >= 3) {
            const panelId = parts[2];

            const panel = panels[0][panelId];
            if (panel) {

                const check = userTicketOpenedConfig.get(interaction.user.id);

                if (check) {

                    const Embed = new EmbedBuilder()
                        .setDescription(`Você já tem um ticket em aberto e não pode abrir outro até fecha-lo!
                    
                    > Caso acha que isso possa ser um problema, entre em contato com um moderador e peça-o para fechar o ticket!

                    > ID do ticket: **${check.ticketID}**
                    > Aberto na categoria: **${check.category}**
                    > Aberto por: <@${check.userID}>
                    > Aberto em: \`${check.openedAt}\``)
                        .setColor(config.color["no-clean"])

                    return interaction.reply({ embeds: [Embed], ephemeral: true });
                }

                const ticketID = generateTicketID();

                const checkExistsParent = await interaction.guild.channels.fetch(panel.ticket_embed.category);
                
                if (!checkExistsParent) {
                    return interaction.reply({
                        content: `Houve um erro na configuração no sistema de ticket, contate um administrator!`,
                        ephemeral: true,
                    });
                }

                interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    parent: panel.ticket_embed.category,
                    topic: `Ticket ID: ${interaction.user.id}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel],
                        },
                        {
                            id: interaction.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                        },
                    ],
                }).then(async (channel) => {

                    const EmbedChannelLink = new EmbedBuilder()
                        .setDescription(`Seu ticket foi criado com sucesso, acesse-o: `)
                        .setColor(config.color["no-clean"])

                    const ButtonChannelLink = new ButtonBuilder()
                        .setLabel(`Acessar seu ticket`)
                        .setURL(`https://discord.com/channels/${interaction.guild.id}/${channel.id}`)
                        .setStyle(ButtonStyle.Link)

                    const row = new ActionRowBuilder().addComponents(ButtonChannelLink);

                    interaction.reply({ embeds: [EmbedChannelLink], components: [row], ephemeral: true });

                    const availableCategories = categoryConfig.get(panelId);

                    if (availableCategories) {
                        const panelCategories = Object.keys(availableCategories);

                        const selectMenu = new StringSelectMenuBuilder()
                            .setCustomId('select_category')
                            .setPlaceholder('Selecione uma categoria')
                            .addOptions(
                                panelCategories.map(category => {
                                    const categoryData = availableCategories[category];
                                    const option = {
                                        label: category,
                                        value: category,
                                        description: categoryData.descricao,
                                    };

                                    if (categoryData.emoji) {
                                        const isCustomEmoji = categoryData.emoji.match(/<:[a-zA-Z0-9_]+:(\d+)>/);

                                        if (isCustomEmoji) {
                                            option.emoji = { id: isCustomEmoji[1], name: categoryData.emoji };
                                        } else {
                                            option.emoji = { name: categoryData.emoji };
                                        }
                                    }

                                    return option;
                                })
                            );

                        const msg = await channel.send({
                            content: 'Selecione a categoria desejada:',
                            components: [new ActionRowBuilder().addComponents(selectMenu)],
                            ephemeral: true,
                        });

                        const filter = (interaction) => {
                            return interaction.customId === 'select_category' && interaction.user.id === interaction.member.user.id;
                        };

                        const collector = channel.createMessageComponentCollector({ filter, time: 120000 });

                        collector.on('collect', async (interaction) => {
                            const selectedCategory = interaction.values[0];
                            collector.stop();

                            interaction.deferUpdate();

                            const ticketInfo = {
                                userID: interaction.user.id,
                                ticketID: ticketID,
                                category: selectedCategory,
                                openedAt: moment().format('LLL'),
                                panelOpenedID: panelId,
                            };

                            userTicketOpenedConfig.set(interaction.user.id, ticketInfo);

                            const Embed = new EmbedBuilder()
                                .setAuthor({ name: 'Novo ticket foi criado!', iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                .setDescription(`Olá ${interaction.user}! Seu ticket foi criado com sucesso, aqui você pode conversar com nossos suporte.
                                
                                > ID: **${ticketID}**
                                > Categoria selecionada: \`${selectedCategory}\`
                                > Horário de abertura: \`${moment().format('LLL')}\`
                                
                                Clique no botão "fechar" para finalizar o atendimento.`)
                                .setColor(config.color["no-clean"]);

                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`close_${ticketID}`)
                                        .setLabel('Fechar ticket')
                                        .setStyle(ButtonStyle.Danger),
                                )
                                

                            msg.edit({ content: `Um belo dia, para um belo ticket. :wave:`, embeds: [Embed], components: [row] });
                        });

                        collector.on('end', (collected, reason) => {
                            if (reason === 'time') {
                                channel.send('Tempo esgotado. O canal será fechado.');
                                setTimeout(() => {
                                    channel.delete();
                                }, 5000);
                            }
                        });
                    } else {
                        await interaction.reply({ content: 'Não há categorias disponíveis!', ephemeral: true });

                        setTimeout(() => {
                            channel.delete();
                        }, 5000);
                    }
                });
            } else {
                await interaction.reply({ content: 'Painel não encontrado!', ephemeral: true });
            }
        } else {
        }

        if (interaction.customId.startsWith("close")) {
            const ticketID = interaction.customId.split("_")[1];
        
            const ticketsData = userTicketOpenedConfig.all();
        
            const channel = interaction.channel;
            const channelTopic = channel.topic;
        
            if (channel) {
                const regexMatch = /Ticket ID:\s*(\w+)/.exec(channelTopic);
                const ticketIDFromTopic = regexMatch ? regexMatch[1] : null;
        
                if (ticketIDFromTopic) {
                    const userId = ticketIDFromTopic;
                    const ticketData = ticketsData.find(item => item.data.ticketID === ticketIDFromTopic || item.data.ticketID === ticketID);
        
                    if (ticketData && ticketData.data.ticketID === ticketID) {
                        await interaction.reply({ content: 'Ticket fechado com sucesso!', ephemeral: true });
        
                        const channelIdLogs = panelsConfig.get(ticketData.data.panelOpenedID)?.ticket_embed?.channelLogsId;
        
                        if (channelIdLogs) {
                            const channelLogs = client.guilds.cache.get(interaction.guildId).channels.cache.get(channelIdLogs);
        
                            if (channelLogs) {
                                const EmbedLogs = new EmbedBuilder()
                                    .setAuthor({ name: 'Ticket foi fechado!', iconURL: interaction.user.avatarURL({ dynamic: true }) })
                                    .setDescription(`O ticket do usuário <@${userId}> foi fechado com sucesso por ${interaction.user}.
                                    
                                    > ID: **${ticketID}**
                                    > Categoria selecionada: \`${ticketData.data.category}\`
                                    > Horário de abertura: \`${ticketData.data.openedAt}\`
                                    > Horário de fechamento: \`${moment().format('LLL')}\`
                                    > Fechado por: ${interaction.user}`)
                                    .setColor(config.color["no-clean"]);
        
                                    const attachment = await Transcripts.createTranscript(interaction.channel);
                                try {
                                    await channelLogs.send({ embeds: [EmbedLogs], files: [attachment] });
                                } catch (error) {
                                    console.log(error);
                                }
                            } else {
                                console.log(`Canal de logs não encontrado para o ID ${channelIdLogs}`);
                            }
                        }
        
                        await channel.delete();
                        userTicketOpenedConfig.delete(userId);
                    } else {
                        console.log(`Ticket não encontrado ou IDs do ticket não coincidem. Channel: ${ticketID}, Config: ${ticketData ? ticketData.data.ticketID : 'N/A'}`);
                        await interaction.reply({ content: 'Os IDs do ticket não coincidem ou o ticket não foi encontrado!', ephemeral: true });
                    }
                } else {
                    console.log('Não foi possível extrair o Ticket ID do tópico do canal.');
                }
            } else {
                console.log('Channel not found.');
            }
        }
    }
}

async function readPanelsConfig() {
    try {
        const rawData = await fs.readFile('src/config/panels.json', 'utf-8');
        const data = JSON.parse(rawData);

        const panels = Array.isArray(data) ? data : [data];

        return panels;
    } catch (error) {
        console.error('Error reading panels file:', error.message);
        return [];
    }
}

function generateTicketID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ticketID = '';

    for (let i = 0; i < 5; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        ticketID += characters.charAt(randomIndex);
    }

    return ticketID;
}