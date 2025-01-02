import path from "path";
import fs from "fs/promises";
import { Collection } from "discord.js";
import config from "../../resources/config.json" assert {type: 'json'};

export async function saveTicketTranscript(channel) {
  const logsDir = path.join(process.cwd(), "logs"); // pasta de logs
  const fileName = `transcript_${channel.name}_${Date.now()}.txt`;
  const messages = new Collection();
  let lastID;

  while (true) {
    const fetched = await channel.messages.fetch({ limit: 100, before: lastID });
    if (fetched.size === 0) break;
    lastID = fetched.last().id;
    fetched.forEach((message) => {
      messages.set(message.id, message);
    });
  }

  let transcript = "";
  messages
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .forEach((message) => {
      const date = new Date(message.createdTimestamp);
      const dateString = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const author = message.author.username;
      const content = message.content;
      transcript += `[${dateString}] ${author}: ${content}\n`;
    });

  const filePath = path.join(logsDir, fileName); // caminho completo do arquivo de log

  await fs.mkdir(logsDir, { recursive: true }); // criar pasta de logs se não existir
  await fs.writeFile(filePath, transcript, "utf-8");

  const logsChannel = channel.guild.channels.cache.get(config.channels["ticket.logs"]);
  if (!logsChannel) {
    throw new Error('Não foi possível encontrar o canal de logs.');
  }
  await logsChannel.send({ files: [filePath] });

  await fs.unlink(filePath);
}