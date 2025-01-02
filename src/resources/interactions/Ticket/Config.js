import { ActionRowBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, PermissionFlagsBits, StringSelectMenuBuilder } from "discord.js";
import Command from "../../../base/Command.js";
import fs from "fs/promises";
import config from "../../config.json" with { type: 'json' };
import { JsonDatabase } from "wio.db";

const categoryConfig = new JsonDatabase({ databasePath: "src/config/categorys.json" });
const panelsConfig = new JsonDatabase({ databasePath: "src/config/panels.json" });

export default class TicketCommand extends Command {
    constructor(client) {
        super(client, {
            name: "ticket",
            description: "Configure o sistema de ticket.",
            options: [
                {
                    name: "painel",
                    description: "Acesse o/os paineis de ticket.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "id",
                            description: "Insira o ID do painel que deseja ver. (ex: 1)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        }
                    ]
                },
                {
                    name: "criar-painel",
                    description: "Crie um painel de ticket.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "id",
                            description: "Insira o ID do painel que deseja criar. (ex: 1)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        }
                    ]
                },
                {
                    name: "criar-categoria",
                    description: "Crie uma categoria para seu ticket.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "id",
                            description: "Insira o ID do painel que deseja criar a categoria. (ex: 1)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "nome",
                            description: "Insira o nome da categoria que deseja criar. (ex: Sugestão)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "descrição",
                            description: "Insira a descrição da categoria que deseja criar.",
                            type: ApplicationCommandOptionType.String,
                            required: false,
                        },
                        {
                            name: "emoji",
                            description: "Insira o emoji da categoria que deseja criar.",
                            type: ApplicationCommandOptionType.String,
                            required: false,
                        }
                    ]
                },
                {
                    name: "remover-categoria",
                    description: "Remova uma categoria para seu ticket.",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: "id",
                            description: "Insira o ID do painel que deseja remover a categoria. (ex: 1)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                        {
                            name: "nome",
                            description: "Insira o nome da categoria que deseja remover. (ex: Sugestão)",
                            type: ApplicationCommandOptionType.String,
                            required: true,
                        },
                    ]
                }
            ],
        });

        this.config = {
            ephemeral: true,
            autoDefer: true,
            requireDatabase: false,
        };
    }

    async run(interaction) {
        if (!interaction.channel.permissionsFor(interaction.user).has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply({
                content: `Você não possui permissão para isso!`,
                ephemeral: true,
            });
        }

        if (interaction.options.getSubcommand() === "remover-categoria") {
            const panelId = interaction.options.getString("id");
            const name = interaction.options.getString("nome");

            const panels = panelsConfig.get(panelId);
            const categoryByPanel = categoryConfig.get(panelId) || {};

            if (!panels) {
                return interaction.editReply({
                    content: "Painel não encontrado.",
                    ephemeral: true,
                });
            }

            if (!categoryByPanel[name]) {
                return interaction.editReply({
                    content: `Nenhuma categoria com o nome "${name}" para este painel.`,
                    ephemeral: true,
                });
            }

            delete categoryByPanel[name];

            categoryConfig.set(panelId, categoryByPanel);

            interaction.editReply({
                content: `Categoria "${name}" removida para o painel ${panelId}!`,
            });
        }

        if (interaction.options.getSubcommand() === "criar-categoria") {
            const panelId = interaction.options.getString("id");
            const name = interaction.options.getString("nome");
            const description = interaction.options.getString("descrição");
            const emoji = interaction.options.getString("emoji");

            const panels = panelsConfig.get(panelId);
            const categoryByPanel = categoryConfig.get(panelId) || {};

            if (!panels) {
                return interaction.editReply({
                    content: "Painel não encontrado.",
                    ephemeral: true,
                });
            }

            if (categoryByPanel[name]) {
                return interaction.editReply({
                    content: `Já existe uma categoria com o nome "${name}" para este painel.`,
                    ephemeral: true,
                });
            }

            categoryByPanel[name] = {
                descricao: description || "",
                emoji: emoji || null,
            };

            categoryConfig.set(panelId, categoryByPanel);

            interaction.editReply({
                content: `Categoria "${name}" criada para o painel ${panelId}!`,
                ephemeral: true,
            });
        }

        if (interaction.options.getSubcommand() === "painel") {
            const panelId = interaction.options.getString("id");

            const panels = await readPanelsConfig();

            if (!panels || Object.keys(panels).length === 0) {
                return interaction.editReply({
                    content: "Nenhum painel encontrado.",
                    ephemeral: true,
                });
            }

            if (!panelId) {
                const panelOptions = Object.keys(panels).map(id => {
                    const panel = panels[id];
                    const label = `(${id}) ${panel.name || 'Sem nome'}`;
                    const value = id;
                    const created = panel.created ? new Date(panel.created).toLocaleString() : 'Data desconhecida';

                    const description = `Criado em ${created}`;

                    return {
                        label,
                        value,
                        description,
                    };
                });

                const panelRow = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId("select_panel")
                            .setPlaceholder("Selecione um painel")
                            .addOptions(panelOptions),
                    );

                return interaction.editReply({
                    content: "Escolha um painel:",
                    ephemeral: true,
                    components: [panelRow],
                });
            }

            // Selecionou o ID
            const panel = panels[panelId];

            if (!panel) {
                return interaction.editReply({
                    content: `Nenhum painel encontrado com o ID ${panelId}.`,
                    ephemeral: true,
                });
            }

            const editOptions = [
                { label: "Editar título", description: "Edita o título da embed do ticket", value: "edit_title" },
                { label: "Editar cor", description: "Edita a cor da embed do ticket", value: "edit_color" },
                { label: "Editar descrição", description: "Edita a descrição da embed do ticket", value: "edit_description" },
                { label: "Editar imagem", description: "Edita a imagem da embed do ticket", value: "edit_image" },
                { label: "Editar rodapé", description: "Edita o rodapé da embed do ticket", value: "edit_footer" },
                { label: "Editar nome do botão", description: "Edita o nome do botão da embed do ticket", value: "edit_name_button" },
                { label: "Editar cor do botão", description: "Edita a cor do botão da embed do ticket", value: "edit_color_button" },
                { label: "Editar emoji do botão", description: "Edita o emoji do botão da embed do ticket", value: "edit_emoji_button" },
            ];

            const editMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("edit_panel")
                        .setPlaceholder("Selecione uma opção para editar")
                        .addOptions(editOptions),
                );

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("select_channel")
                        .setLabel("Selecionar canal de abertura")
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId("delete_panel")
                        .setLabel("Excluir")
                        .setStyle(ButtonStyle.Danger),
                )
            const buttonRow2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("select_logs")
                        .setLabel("Selecionar canal de logs")
                        .setStyle(ButtonStyle.Secondary),

                    new ButtonBuilder()
                        .setCustomId("select_category")
                        .setLabel("Selecionar categoria de abertura")
                        .setStyle(ButtonStyle.Secondary),
                )

            const EmbedSelectedPanel = new EmbedBuilder()
                .setAuthor({ name: `Painel ${panelId}: ${panel.name || 'Sem nome'}`, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                .setDescription(`Aqui você pode editar diversas coisas do painel, que tiver no menu abaixo, basta selecionar e alterar!
                
                Acompanhe as informações atuais do painel:
                > ID: **${panelId}**
                > Nome: **${panel.name || 'Sem nome'}**
                > Criado em: **${panel.created ? new Date(panel.created).toLocaleString() : 'Data desconhecida'}**
                
                Acompanhe as informações do ticket deste painel:
                > Titulo: **${panel.ticket_embed.title}**
                > Cor: **${panel.ticket_embed.color}**
                > Descricao: **${panel.ticket_embed.description}**
                > Imagem: **${panel.ticket_embed.image || 'Nenhuma imagem'}**
                > Rodape: **${panel.ticket_embed.footer || 'Nenhum rodapé'}**
                
                \`Lembre-se:\` Após alterar algo no painel, recomendo executar o comando do painel novamente para ver as configurações.`)
                .setColor(config.color["no-clean"]);

            interaction.editReply({
                content: "Escolha uma opção para editar:",
                embeds: [EmbedSelectedPanel],
                components: [editMenu, buttonRow, buttonRow2],
                ephemeral: true,
            });

            const filter = (interaction) => {
                return interaction.customId.startsWith('edit_panel') || interaction.customId === 'select_channel' || interaction.customId === 'delete_panel' || interaction.customId === 'select_logs' || interaction.customId === 'select_category';
            };

            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 120000 });

            collector.on('collect', async (i) => {
                if (i.isButton()) {
                    if (i.customId === 'select_channel') {
                        await i.reply({
                            content: 'Por favor, mencione o canal onde deseja enviar a embed de abertura de tickets.',
                            ephemeral: true,
                        });

                        const filter = (msg) => msg.author.id === i.user.id && msg.mentions.channels.size > 0;
                        const collector = i.channel.createMessageCollector({ filter, time: 60000 });

                        collector.on('collect', async (msg) => {
                            const selectedChannel = msg.mentions.channels.first();

                            if (!selectedChannel) {
                                await i.editReply({
                                    content: 'Canal inválido. Por favor, mencione um canal válido e tente novamente.',
                                    ephemeral: true,
                                });
                                return;
                            }

                            const channelId = selectedChannel.id;

                            const EmbedAbertura = new EmbedBuilder()
                                .setAuthor({ name: `${panel.ticket_embed.title}`, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                .setDescription(panel.ticket_embed.description)
                                .setColor(panel.ticket_embed.color)
                                .setImage(panel.ticket_embed.image)
                                .setFooter({ text: panel.ticket_embed.footer });

                            const button = new ActionRowBuilder();

                            if (panel.ticket_button.emoji) {
                                button.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(panel.ticket_button.custom_id)
                                        .setLabel(panel.ticket_button.label)
                                        .setStyle(ButtonStyle[panel.ticket_button.style])
                                        .setEmoji(panel.ticket_button.emoji),
                                );
                            } else {
                                button.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(panel.ticket_button.custom_id)
                                        .setLabel(panel.ticket_button.label)
                                        .setStyle(ButtonStyle[panel.ticket_button.style]),
                                );
                            }

                            const sentMessage = await selectedChannel.send({ embeds: [EmbedAbertura], components: [button] });

                            const messageId = sentMessage.id;
                            msg.delete();

                            const panels = await readPanelsConfig();

                            if (panels && panels[panelId]) {
                                panels[panelId].ticket_embed.channelId = channelId;
                                panels[panelId].ticket_embed.messageId = messageId;

                                await savePanelsConfig(panels);

                                await i.editReply({
                                    content: `Canal selecionado: ${selectedChannel}\nMensagem de abertura de tickets enviada.`,
                                    ephemeral: true,
                                });
                            } else {
                                await i.editReply({
                                    content: 'Erro ao salvar o canal. Por favor, tente novamente.',
                                    ephemeral: true,
                                });
                            }

                            collector.stop();
                        });

                        collector.on('end', (collected) => {
                            if (collected.size === 0) {
                                i.followUp({
                                    content: 'Tempo esgotado. Por favor, mencione o canal e tente novamente.',
                                    ephemeral: true,
                                });
                            }
                        });
                    } else if (i.customId === 'delete_panel') {
                        if (panels && panels[panelId]) {
                            const panel = panels[panelId];

                            if (panel?.ticket_embed?.messageId && panel?.ticket_embed?.channelId) {
                                const channel = this.client.guilds.cache.get(interaction.guildId).channels.cache.get(panel.ticket_embed.channelId);

                                if (channel) {
                                    try {
                                        const message = await channel.messages.fetch(panel.ticket_embed.messageId);
                                        await message.delete();
                                    } catch (error) {
                                        console.error(`Erro ao excluir mensagem: ${error.message}`);
                                    }
                                } else {
                                    console.error(`Canal não encontrado para o ID ${panel.ticket_embed.channelId}`);
                                }
                            }

                            delete panels[panelId];

                            if (Object.keys(panels).length === 0) {
                                await savePanelsConfig({});
                            } else {
                                await savePanelsConfig(panels);
                            }

                            await interaction.editReply({
                                content: `Painel com ID ${panelId} foi excluído com sucesso.`,
                                components: [],
                                embeds: [],
                                ephemeral: true,
                            });

                            collector.stop();
                        } else {
                            await i.reply({
                                content: `Nenhum painel encontrado com o ID ${panelId}.`,
                                ephemeral: true,
                            });
                        }
                    } else if (i.customId === 'select_logs') {
                        await i.reply({
                            content: 'Por favor, mencione o canal onde será enviado as logs dos tickets.',
                            ephemeral: true,
                        });

                        const filter = (msg) => msg.author.id === i.user.id && msg.mentions.channels.size > 0;
                        const collector = i.channel.createMessageCollector({ filter, time: 60000 });

                        collector.on('collect', async (msg) => {
                            const selectedChannel = msg.mentions.channels.first();

                            if (!selectedChannel) {
                                await i.editReply({
                                    content: 'Canal inválido. Por favor, mencione um canal válido e tente novamente.',
                                    ephemeral: true,
                                });
                                return;
                            }

                            const channelId = selectedChannel.id;
                            msg.delete();

                            const panels = await readPanelsConfig();

                            if (panels && panels[panelId]) {
                                panels[panelId].ticket_embed.channelLogsId = channelId;

                                await savePanelsConfig(panels);

                                await i.editReply({
                                    content: `Canal selecionado: ${selectedChannel}\nSerá enviado as logs dos tickets nele.`,
                                    ephemeral: true,
                                });
                            } else {
                                await i.editReply({
                                    content: 'Erro ao salvar o canal. Por favor, tente novamente.',
                                    ephemeral: true,
                                });
                            }

                            collector.stop();
                        });

                        collector.on('end', (collected) => {
                            if (collected.size === 0) {
                                i.followUp({
                                    content: 'Tempo esgotado. Por favor, mencione o canal e tente novamente.',
                                    ephemeral: true,
                                });
                            }
                        });
                    } else if (i.customId === 'select_category') {
                        await i.reply({
                            content: 'Por favor, informe o nome da categoria onde as logs dos tickets serão enviadas.',
                            ephemeral: true,
                        });

                        const filter = (msg) => msg.author.id === i.user.id;
                        const collector = i.channel.createMessageCollector({ filter, time: 60000 });

                        collector.on('collect', async (msg) => {
                            const categoryName = msg.content.trim();
                            if (!categoryName) {
                                await i.editReply({
                                    content: 'Nome de categoria inválido. Por favor, informe um nome de categoria válido e tente novamente.',
                                    ephemeral: true,
                                });
                                return;
                            }

                            const guild = i.guild;
                            const category = guild.channels.cache.find(
                                (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
                            );

                            if (!category) {
                                await i.editReply({
                                    content: `Categoria '${categoryName}' não encontrada. Certifique-se de que a categoria existe e tente novamente.`,
                                    ephemeral: true,
                                });
                                return;
                            }

                            const categoryId = category.id;
                            msg.delete();

                            const panels = await readPanelsConfig();

                            if (panels && panels[panelId]) {
                                panels[panelId].ticket_embed.category = categoryId;

                                await savePanelsConfig(panels);

                                await i.editReply({
                                    content: `Categoria selecionada: ${category.name}\nSerão enviadas as logs dos tickets dentro dessa categoria.`,
                                    ephemeral: true,
                                });
                            } else {
                                await i.editReply({
                                    content: 'Erro ao salvar a categoria. Por favor, tente novamente.',
                                    ephemeral: true,
                                });
                            }

                            collector.stop();
                        });

                        collector.on('end', (collected) => {
                            if (collected.size === 0) {
                                i.followUp({
                                    content: 'Tempo esgotado. Por favor, informe o nome da categoria e tente novamente.',
                                    ephemeral: true,
                                });
                            }
                        });
                    }
                } else if (i.isSelectMenu()) {
                    if (i.customId === 'edit_panel') {
                        const selectedOption = i.values[0];

                        switch (selectedOption) {
                            case 'edit_title':
                                await i.reply({
                                    content: 'Por favor, digite o novo título para a embed do ticket.',
                                    ephemeral: true,
                                });

                                const titleFilter = (msg) => msg.author.id === i.user.id;
                                const titleCollector = i.channel.createMessageCollector({ titleFilter, time: 60000 });

                                titleCollector.on('collect', async (msg) => {
                                    const newTitle = msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const EmbedAbertura = new EmbedBuilder()
                                                .setAuthor({ name: newTitle, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                                .setDescription(panel.ticket_embed.description)
                                                .setColor(panel.ticket_embed.color)
                                                .setImage(panel.ticket_embed.image)
                                                .setFooter({ text: panel.ticket_embed.footer });

                                            await message.edit({ embeds: [EmbedAbertura] });
                                        }

                                        panels[panelId].ticket_embed.title = newTitle;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Título da embed do ticket atualizado para: ${newTitle}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar o título. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    titleCollector.stop();
                                });

                                titleCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado. Por favor, digite o novo título e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_color':
                                await i.reply({
                                    content: 'Por favor, digite a nova cor (em formato hexadecimal) para a embed do ticket.',
                                    ephemeral: true,
                                });

                                const colorFilter = (msg) => msg.author.id === i.user.id;
                                const colorCollector = i.channel.createMessageCollector({ colorFilter, time: 60000 });

                                colorCollector.on('collect', async (msg) => {
                                    const newColor = msg.content;

                                    const hexColorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
                                    if (!hexColorRegex.test(newColor)) {
                                        await i.editReply({
                                            content: 'Por favor, forneça uma cor em formato hexadecimal válido. Exemplo: #RRGGBB.',
                                            ephemeral: true,
                                        });
                                        colorCollector.stop();
                                        return;
                                    }

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const EmbedAbertura = new EmbedBuilder()
                                                .setAuthor({ name: panel.ticket_embed.title, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                                .setDescription(panel.ticket_embed.description)
                                                .setColor(newColor)
                                                .setImage(panel.ticket_embed.image)
                                                .setFooter({ text: panel.ticket_embed.footer });

                                            await message.edit({ embeds: [EmbedAbertura] });
                                        }

                                        panels[panelId].ticket_embed.color = newColor;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Cor da embed do ticket atualizada para: ${newColor}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar a cor. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    colorCollector.stop();
                                });

                                colorCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado. Por favor, digite a nova cor e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_description':
                                await i.reply({
                                    content: 'Por favor, digite a nova descrição para a embed do ticket.',
                                    ephemeral: true,
                                });

                                const descFilter = (msg) => msg.author.id === i.user.id;
                                const descCollector = i.channel.createMessageCollector({ filter: descFilter, time: 120000 });

                                descCollector.on('collect', async (msg) => {
                                    const newDescription = msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const EmbedAbertura = new EmbedBuilder()
                                                .setAuthor({ name: panel.ticket_embed.title, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                                .setDescription(newDescription)
                                                .setColor(panel.ticket_embed.color)
                                                .setImage(panel.ticket_embed.image)
                                                .setFooter({ text: panel.ticket_embed.footer });

                                            await message.edit({ embeds: [EmbedAbertura] });
                                        }

                                        panels[panelId].ticket_embed.description = newDescription;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Descrição da embed do ticket atualizada para: ${newDescription}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar a descrição. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    descCollector.stop();
                                });

                                descCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado. Por favor, digite a nova descrição e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_image':
                                await i.reply({
                                    content: 'Por favor, digite o link da nova imagem para a embed do ticket (certifique-se de que comece com http:// ou https://) (Digite **null** caso queira deixar sem).',
                                    ephemeral: true,
                                });

                                const validUrlRegex = /^(https?|http):\/\/.+/;
                                const imageFilter = (msg) => msg.author.id === i.user.id && (msg.content === 'null' || validUrlRegex.test(msg.content));
                                const imageCollector = i.channel.createMessageCollector({ filter: imageFilter, time: 60000 });

                                imageCollector.on('collect', async (msg) => {
                                    const newImage = msg.content === 'null' ? null : msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const EmbedAbertura = new EmbedBuilder()
                                                .setAuthor({ name: panel.ticket_embed.title, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                                .setDescription(panel.ticket_embed.description)
                                                .setColor(panel.ticket_embed.color)
                                                .setImage(newImage)
                                                .setFooter({ text: panel.ticket_embed.footer });

                                            await message.edit({ embeds: [EmbedAbertura] });
                                        }

                                        panels[panelId].ticket_embed.image = newImage;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Imagem da embed do ticket atualizada.`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar a imagem. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    imageCollector.stop();
                                });

                                imageCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado ou link inválido. Por favor, digite um link válido começando com http:// ou https:// ou "null" para remover a imagem e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_footer':
                                await i.reply({
                                    content: 'Por favor, digite o novo rodapé para a embed do ticket. (Digite **null** caso queira deixar sem)',
                                    ephemeral: true,
                                });

                                const footerFilter = (msg) => msg.author.id === i.user.id;
                                const footerCollector = i.channel.createMessageCollector({ filter: footerFilter, time: 60000 });

                                footerCollector.on('collect', async (msg) => {
                                    const newFooter = msg.content === 'null' ? null : msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const EmbedAbertura = new EmbedBuilder()
                                                .setAuthor({ name: panel.ticket_embed.title, iconURL: this.client.user.avatarURL({ dynamic: true }) })
                                                .setDescription(panel.ticket_embed.description)
                                                .setColor(panel.ticket_embed.color)
                                                .setImage(panel.ticket_embed.image)
                                                .setFooter({ text: newFooter });

                                            await message.edit({ embeds: [EmbedAbertura] });
                                        }

                                        panels[panelId].ticket_embed.footer = newFooter;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Rodapé da embed do ticket atualizado para: ${newFooter || 'Nenhum rodapé'}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar o rodapé. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    footerCollector.stop();
                                });

                                footerCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado. Por favor, digite o novo rodapé e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_name_button':
                                await i.reply({
                                    content: 'Por favor, digite o novo nome para o botão de abertura de tickets.',
                                    ephemeral: true,
                                });

                                const nameButtonFilter = (msg) => msg.author.id === i.user.id;
                                const nameButtonCollector = i.channel.createMessageCollector({ filter: nameButtonFilter, time: 60000 });

                                nameButtonCollector.on('collect', async (msg) => {
                                    const newNameButton = msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const buttonBuilder = new ButtonBuilder()
                                                .setCustomId(panel.ticket_button.custom_id)
                                                .setLabel(newNameButton)
                                                .setStyle(ButtonStyle[panel.ticket_button.style]);

                                            if (panel.ticket_button.emoji) {
                                                const isCustomEmoji = panel.ticket_button.emoji.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);

                                                if (isCustomEmoji) {
                                                    const emojiId = isCustomEmoji[1];
                                                    buttonBuilder.setEmoji({ id: emojiId, name: panel.ticket_button.emoji });

                                                    const isAnimated = panel.ticket_button.emoji.startsWith('<a:');
                                                    if (isAnimated) {
                                                        buttonBuilder.setEmoji({ id: emojiId, name: panel.ticket_button.emoji, animated: true });
                                                    }
                                                } else {
                                                    buttonBuilder.setEmoji({ name: panel.ticket_button.emoji });
                                                }
                                            }

                                            const newButton = new ActionRowBuilder().addComponents(buttonBuilder);

                                            await message.edit({ components: [newButton] });
                                        }

                                        panels[panelId].ticket_button.label = newNameButton;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Nome do botão de abertura de tickets atualizado para: ${newNameButton}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar o nome do botão. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    nameButtonCollector.stop();
                                });

                                nameButtonCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado. Por favor, digite o novo nome do botão e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_emoji_button':
                                await i.reply({
                                    content: 'Por favor, digite o novo emoji para o botão de abertura de tickets (pode ser um emoji do Discord ou um emoji personalizado).',
                                    ephemeral: true,
                                });

                                const emojiFilter = (msg) => msg.author.id === i.user.id && msg.content.match(/<a?:[a-zA-Z0-9_]+:[0-9]+>/);
                                const emojiCollector = i.channel.createMessageCollector({ filter: emojiFilter, time: 60000 });

                                emojiCollector.on('collect', async (msg) => {
                                    const newEmoji = msg.content;

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const buttonBuilder = new ButtonBuilder()
                                                .setCustomId(panel.ticket_button.custom_id)
                                                .setLabel(panel.ticket_button.label)
                                                .setStyle(ButtonStyle[panel.ticket_button.style]);

                                            const isCustomEmoji = newEmoji.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);

                                            if (isCustomEmoji) {
                                                const emojiId = isCustomEmoji[1];
                                                buttonBuilder.setEmoji({ id: emojiId, name: newEmoji });

                                                const isAnimated = newEmoji.startsWith('<a:');
                                                if (isAnimated) {
                                                    buttonBuilder.setEmoji({ id: emojiId, name: newEmoji, animated: true });
                                                }
                                            } else {
                                                buttonBuilder.setEmoji({ name: newEmoji });
                                            }

                                            const newButton = new ActionRowBuilder().addComponents(buttonBuilder);

                                            await message.edit({ components: [newButton] });
                                        }

                                        panels[panelId].ticket_button.emoji = newEmoji;
                                        await savePanelsConfig(panels);
                                        msg.delete();

                                        await i.editReply({
                                            content: `Emoji do botão de abertura de tickets atualizado para: ${newEmoji}`,
                                            ephemeral: true,
                                        });
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar o emoji do botão. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }

                                    emojiCollector.stop();
                                });

                                emojiCollector.on('end', (collected) => {
                                    if (collected.size === 0) {
                                        i.editReply({
                                            content: 'Tempo esgotado ou emoji inválido. Por favor, digite um emoji válido (pode ser do Discord ou um emoji personalizado) e tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });
                                break;
                            case 'edit_color_button':
                                const styles = ['Primary', 'Secondary', 'Danger', 'Success'];

                                const styleButtons = styles.map((style, index) => new ButtonBuilder()
                                    .setCustomId(`select_style_${index + 1}`)
                                    .setLabel(style)
                                    .setStyle(ButtonStyle[style])
                                );

                                const buttonRow = new ActionRowBuilder().addComponents(...styleButtons);

                                await i.reply({
                                    content: 'Escolha um estilo para o botão de abertura de tickets:',
                                    ephemeral: true,
                                    components: [buttonRow],
                                });

                                const filter = (interaction) => {
                                    return interaction.customId.startsWith('select_style_') && interaction.user.id === i.user.id;
                                };

                                const collector = i.channel.createMessageComponentCollector({ filter, time: 60000 });

                                collector.on('collect', async (interaction) => {
                                    const selectedStyleIndex = parseInt(interaction.customId.split('_')[2]) - 1;
                                    const selectedStyle = styles[selectedStyleIndex];

                                    const panels = await readPanelsConfig();
                                    if (panels && panels[panelId]) {
                                        const panel = panels[panelId];

                                        const channel = i.guild.channels.cache.get(panel.ticket_embed.channelId);
                                        const message = await channel?.messages.fetch(panel.ticket_embed.messageId).catch(() => null);

                                        if (channel && message) {
                                            const buttonBuilder = new ButtonBuilder()
                                                .setCustomId(panel.ticket_button.custom_id)
                                                .setLabel(panel.ticket_button.label)
                                                .setStyle(ButtonStyle[selectedStyle]);

                                            if (panel.ticket_button.emoji) {
                                                const isCustomEmoji = panel.ticket_button.emoji.match(/<a?:[a-zA-Z0-9_]+:(\d+)>/);

                                                if (isCustomEmoji) {
                                                    const emojiId = isCustomEmoji[1];
                                                    buttonBuilder.setEmoji({ id: emojiId, name: panel.ticket_button.emoji });

                                                    const isAnimated = panel.ticket_button.emoji.startsWith('<a:');
                                                    if (isAnimated) {
                                                        buttonBuilder.setEmoji({ id: emojiId, name: panel.ticket_button.emoji, animated: true });
                                                    }
                                                } else {
                                                    buttonBuilder.setEmoji({ name: panel.ticket_button.emoji });
                                                }
                                            }

                                            const newButton = new ActionRowBuilder().addComponents(buttonBuilder);

                                            await message.edit({ components: [newButton] });
                                        }

                                        panels[panelId].ticket_button.style = selectedStyle;
                                        await savePanelsConfig(panels);

                                        await i.editReply({
                                            content: `Estilo do botão de abertura de tickets atualizado para: ${selectedStyle}`,
                                            components: [],
                                            ephemeral: true,
                                        });

                                        collector.stop();
                                    } else {
                                        await i.editReply({
                                            content: 'Erro ao atualizar o estilo do botão. Por favor, tente novamente.',
                                            components: [],
                                            ephemeral: true,
                                        });
                                    }
                                });

                                collector.on('end', (collected, reason) => {
                                    if (reason === 'time') {
                                        i.followUp({
                                            content: 'Tempo esgotado. Por favor, tente novamente.',
                                            ephemeral: true,
                                        });
                                    }
                                });

                                break;
                            default:
                                break;
                        }
                    }
                }
            });

            collector.on('end', (collected) => {
                console.log(`Coletor encerrado. Collected ${collected.size} interações.`);
            });
        }

        if (interaction.options.getSubcommand() === "criar-painel") {
            const panelId = interaction.options.getString("id");

            const panels = await readPanelsConfig();

            if (panelId && panels && panels[panelId]) {
                return interaction.editReply({
                    content: `Já existe um painel com o ID ${panelId}.`,
                    ephemeral: true,
                });
            }

            const autoPanelName = `ticket-${generateRandomString(5)}`;

            const defaultPanelConfig = {
                created: new Date().toISOString(),
                name: autoPanelName,
                ticket_embed: {
                    title: "Ticket",
                    color: "#ff0000",
                    description: "Crie um ticket aí!",
                    image: null,
                    footer: null,
                },
                ticket_button: {
                    label: "Abrir ticket",
                    emoji: null,
                    style: "Primary",
                    custom_id: `${autoPanelName}-${panelId}`,
                },
            };

            panels[panelId] = defaultPanelConfig;

            await savePanelsConfig(panels);

            return interaction.editReply({
                content: `Painel criado com sucesso. ${panelId ? 'ID' : 'Novo ID'}: ${panelId || autoPanelName}`,
                ephemeral: true,
            });
        }
    }
}

async function readPanelsConfig() {
    try {
        const rawData = await fs.readFile('src/config/panels.json', 'utf-8');
        const categories = JSON.parse(rawData);
        return categories;
    } catch (error) {
        console.error('Error reading panels file:', error.message);
        return [];
    }
}

async function savePanelsConfig(panels) {
    await fs.writeFile('src/config/panels.json', JSON.stringify(panels, null, 2), 'utf-8');
}

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}