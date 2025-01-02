import { ButtonStyle, EmbedBuilder } from "discord.js";
import { createButton, createRow } from "../Interactions/CreateButton.js";
import config from "../../resources/config.json" assert {type: 'json'};

export async function createTicketRecord(connection, serverId) {
    try {
        let ticketNumber;

        const [existingRecord] = await connection.execute('SELECT id, ticket_number FROM ticket_ids WHERE server_id = ?', [serverId]);

        if (existingRecord.length > 0) {
            ticketNumber = existingRecord[0].ticket_number;

            ticketNumber++;

            await connection.execute('UPDATE ticket_ids SET ticket_number = ? WHERE id = ?', [ticketNumber, existingRecord[0].id]);

            console.log('Registro de ticket já existente. Número do ticket atualizado:', ticketNumber);
        } else {
            const [result] = await connection.execute('INSERT INTO ticket_ids (server_id, ticket_number) VALUES (?, 1)', [serverId]);
            ticketNumber = result.insertId;

            console.log('Novo registro de ticket criado. Número do ticket:', ticketNumber);
        }
    } catch (error) {
        console.error('Erro ao criar/atualizar registro de ticket: ' + error.message);
        throw error;
    }
}

export async function getTicketRecordByServerId(connection, serverId) {
    try {
        const [rows] = await connection.execute('SELECT id, ticket_number, server_id FROM ticket_ids WHERE server_id = ?', [serverId]);

        if (rows.length > 0) {
            return {
                id: rows[0].id,
                ticket_number: rows[0].ticket_number,
                server_id: rows[0].server_id
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter informações do ticket: ' + error.message);
        throw error;
    }
}

export async function getTicketRecordByChannel(connection, channelId) {
    try {
        const [rows] = await connection.execute('SELECT * FROM ticket_ids WHERE channel_id = ?', [channelId]);

        if (rows.length > 0) {
            return {
                id: rows[0].id,
                server_id: rows[0].server_id,
                channel_id: rows[0].channel_id,
                ticket_number: rows[0].ticket_number,
                timestamp: rows[0].timestamp
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter informações do ticket: ' + error.message);
        throw error;
    }
}

export async function saveTicketMessage(connection, serverId, messageId, channelId) {
    try {
        await connection.execute(`
            INSERT INTO server_reviews (server_id, message_id, channel_id)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
            message_id = VALUES(message_id),
            channel_id = VALUES(channel_id);
        `, [serverId, messageId, channelId]);
    } catch (error) {
        console.error('Erro ao salvar a revisão do servidor: ' + error.message);
        throw error;
    }
}

export async function getTicketIds(connection, serverId) {
    try {
        const [rows] = await connection.execute('SELECT message_id, channel_id FROM server_reviews WHERE server_id = ?', [serverId]);

        if (rows.length > 0) {
            return {
                messageId: rows[0].message_id,
                channelId: rows[0].channel_id
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter informações da revisão do servidor: ' + error.message);
        throw error;
    }
}

export async function sendOrEditTicketEmbed(client, channel, averageRating, existingMessage) {
    const EmbedTicket = new EmbedBuilder()
        .setAuthor({ name: `Adquira um bot e facilite sua vida!`, iconURL: client.user.avatarURL({ dynamic: true }) })
        .setDescription(`Para criar um atendimento privado para ver o orçamento do teu bot, ou para tirar dúvidas, basta clicar no botão abaixo.`)
        .setColor(config.color["no-clean"])
        .setImage("https://images-ext-2.discordapp.net/external/Y-QERbVZeY9OPUNCcywZdW8I_qsRrq6ggUbJRsfZbBg/https/imgur.com/NrfqBF8.png?format=webp&width=1440&height=375")
        .addFields([
            {
                name: "Média de avaliação",
                value: averageRating,
                inline: true
            }
        ]);

    const Button = createButton({
        customId: 'ButtonAtendimento',
        label: "Abrir um ticket",
        style: ButtonStyle.Secondary
    });

    const row = createRow([Button]);

    try {
        if (existingMessage) {
            await existingMessage.edit({ embeds: [EmbedTicket], components: [row] });
            return existingMessage;
        } else {
            const message = await channel.send({ embeds: [EmbedTicket], components: [row] });
            return message;
        }
    } catch (error) {
        console.error('Erro ao enviar/editar a embed do ticket: ' + error.message);
        throw error;
    }
}