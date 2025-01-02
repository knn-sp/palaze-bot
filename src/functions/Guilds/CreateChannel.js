import { ChannelType } from "discord.js";

export async function createTextChannel(guild, channelName, channelParent, channelTopic, channelPermissions) {
    try {
        const channel = await guild.channels.create({
            name: channelName, 
            parent: channelParent,
            topic: channelTopic,
            type: ChannelType.GuildText,
            permissionOverwrites: channelPermissions
        });

        return channel;
    } catch (error) {
        console.error(error);
    }
}