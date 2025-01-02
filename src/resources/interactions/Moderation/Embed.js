import { EmbedBuilder } from "discord.js";
import Command from "../../../base/Command.js";
import config from "../../config.json" with { type: 'json' };

export default class AnnounceCommand extends Command {
    constructor(client) {
        super(client, {
            name: "embed",
            description: "Crie um anúncio personalizado.",
        });

        this.config = {
            ephemeral: false,
            autoDefer: false,
            requireDatabase: false,
        };
    }

    async run(interaction) {
        await interaction.reply("Por favor, forneça o título do anúncio.");
        const titleResponse = await interaction.channel.awaitMessages({
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const title = titleResponse.first().content;

        await interaction.followUp("Agora, forneça a descrição do anúncio.");
        const descriptionResponse = await interaction.channel.awaitMessages({
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const description = descriptionResponse.first().content;

        await interaction.followUp("Qual cor você deseja para a embed? (Exemplo: #ff5733)");
        const colorResponse = await interaction.channel.awaitMessages({
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const colorInput = colorResponse.first().content;

        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        const color = colorRegex.test(colorInput) ? colorInput : config.color["no-clean"];

        await interaction.followUp("Você deseja adicionar uma imagem ao anúncio? Responda com 'sim' ou 'não'.");
        const imageResponse = await interaction.channel.awaitMessages({
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const hasImage = imageResponse.first().content.toLowerCase() === 'sim';

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (hasImage) {
            await interaction.followUp("Por favor, forneça o link da imagem.");
            const imageUrlResponse = await interaction.channel.awaitMessages({
                max: 1,
                time: 60000,
                errors: ['time']
            });

            const imageUrl = imageUrlResponse.first().content;

            embed.setImage(imageUrl);
        }

        await interaction.followUp("Por favor, mencione o canal para enviar o anúncio ou digite 'AQUI' para enviar neste canal.");
        const channelResponse = await interaction.channel.awaitMessages({
            max: 1,
            time: 60000,
            errors: ['time']
        });

        const channelMention = channelResponse.first().content;

        let targetChannel;
        if (channelMention.toLowerCase() === 'aqui') {
            targetChannel = interaction.channel;
        } else {
            targetChannel = interaction.guild.channels.cache.get(channelMention.replace(/[<@#>]/g, '')) || null;
        }

        if (!targetChannel) {
            return interaction.followUp("Canal inválido. Por favor, mencione um canal válido ou digite 'AQUI'.");
        }

        targetChannel.send({ embeds: [embed] });
        interaction.followUp("Anúncio enviado com sucesso!");
    }
}