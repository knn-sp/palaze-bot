import axios from "axios";

const minecraftServerIp = 'jogar.minebeats.com.br';
const minecraftServerPort = 25565;
const voiceChannelId = '1075404728109907968';

async function getMinecraftServerInfo() {
    try {
        const response = await axios.get(`https://mcapi.us/server/status?ip=${minecraftServerIp}&port=${minecraftServerPort}`);
        return response.data.players.now;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function updateVoiceChannelName(client) {
    const voiceChannel = await client.channels.fetch(voiceChannelId);
    if (voiceChannel && voiceChannel.type === 'GUILD_VOICE' && voiceChannel instanceof VoiceChannel) {
        const playerCount = await getMinecraftServerInfo();
        if (playerCount !== null) {
            voiceChannel.setName(`Jogadores Online: ${playerCount}`);
        }
    }
}