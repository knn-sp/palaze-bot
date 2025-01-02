import axios from "axios";
import { createEmbed } from "../Embeds/CreateEmbed.js";
import config from "../../resources/config.json" assert {type: 'json'};

export async function updateServerStatus(client, serverIp, channelId, interval) {
    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error(`O canal com ID ${channelId} não foi encontrado!`);

    let lastMessageId;

    setInterval(async () => {
        try {
            const response = await axios.get(`https://api.mcsrvstat.us/2/${serverIp}`);
            const players = response.data.players.online;
            const maxPlayers = response.data.players.max;

            const embed = createEmbed({
                description: `Você pode acompanhar o status de todos servidores da rede **MineBeats** logo abaixo:
                
                <:picareta:874717099979866122> **Rank UP Overpower**
                <:ping2:874727962459660339> Jogadores conectados no momento: \`${players}\`
                
                > O servidor se encontra **online**, venha jogar!
                > IP de conexão: **jogar.minebeats.com.br**
                > Site: [loja.minebeats.com.br](https://loja.minebeats.com.br)`,
                color: config.color
            })

            if (lastMessageId) {
                const lastMessage = await channel.messages.fetch(lastMessageId);
                if (lastMessage) {
                    await lastMessage.edit({ embeds: [embed] });
                    return;
                }
            }

            const newMessage = await channel.send({ embeds: [embed] });
            lastMessageId = newMessage.id;
        } catch (error) {
            console.error(error);

            const embed = createEmbed({
                description: `Você pode acompanhar o status de todos servidores da rede **MineBeats** logo abaixo:
                
                <:picareta:874717099979866122> **Rank UP Overpower**
                
                > O servidor se encontra **offline**, venha jogar!
                > IP de conexão: **jogar.minebeats.com.br**
                > Site: [loja.minebeats.com.br](https://loja.minebeats.com.br)`,
                color: 'Red'
            })

            if (lastMessageId) {
                const lastMessage = await channel.messages.fetch(lastMessageId);
                if (lastMessage) {
                    await lastMessage.edit({ embeds: [embed] });
                    return;
                }
            }

            const newMessage = await channel.send({ embeds: [embed] });
            lastMessageId = newMessage.id;
        }
    }, interval);
}