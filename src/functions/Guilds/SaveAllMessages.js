import { EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { format } from "date-fns";
import { advancedFormatEmbed } from "../Embeds/CreateEmbed.js"

const bold = (text) => `**${text}**`;
const italic = (text) => `*${text}*`;
const code = (text) => `\`${text}\``;
const codeblock = (text, lang = '') => `\`\`\`${lang}\n${text}\n\`\`\``;
const quote = (text) => `${text}`;
const mention = (userId) => `<@${userId}>`;

export async function saveChannelMessages(client, channelId, fileName) {
  const channel = client.channels.cache.get(channelId);
  if (!channel) {
    console.log(`Canal inválido: ${channelId}`);
    return;
  }

  const messages = await channel.messages.fetch();

  const html = [
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>Mensagens do canal #${channel.name}</title>`,
    '<style>',
    'body { font-family: Arial, sans-serif; background-color: #f4f4f4; }',
    '.message { border: 1px solid #ccc; padding: 10px; margin: 10px; border-radius: 10px; position: relative; background-color: #fff; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3); width: calc(100% - 20px);}',
    '.author { font-weight: bold; color: #4d4d4d; }',
    '.author-container { display: flex; align-items: center; }',
    '.timestamp { font-size: 0.8em; color: #999; margin-left: 5px; margin-top: 5px; }',
    '.content { margin-top: 10px; color: #4d4d4d; }',
    '.embeds { margin-top: 10px; background-color: #eee; padding: 10px; border-radius: 10px; box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3); }',
    '.embed-color-bar { width: 5px; height: 100%; position: absolute; left: 0; top: 0; border-top-left-radius: 10px; border-bottom-left-radius: 10px; }',
    '.attachments { margin-top: 10px; }',
    '.author-image { width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; }',
    '.avatar { width: 32px; height: 32px; border-radius: 50%; margin-right: 10px; }',
    'ul { margin: 0; padding: 0; list-style-type: none; }',
    'a { color: #4d4d4d; }',
    '</style>',
    '</head>',
    '<body>'
  ];

  messages.each((message) => {
    if (!message.author) {
      return;
    }

    const content = message.content;
    const author = client.users.cache.get(message.author.id).username;
    const timestamp = format(message.createdAt, "dd/MM/yyyy HH:mm:ss");
    const formattedContent = quote(content.split('\n').map((line) => `${line}`).join('\n'));
    const formattedEmbeds = message.embeds.map((embed) => advancedFormatEmbed(embed));
    const formattedAttachments = message.attachments.map((attachment) => attachment.url);

    html.push('<div class="message">');
    const embedColor = message.embeds.length > 0 ? message.embeds[0].hexColor : '';
    html.push(`<div class="embed-color-bar" style="background-color: ${embedColor};"></div>`);
    html.push(`<div class="author-container">`);
    html.push(`<img src="${message.author.displayAvatarURL({ format: 'png', dynamic: true })}" alt="Avatar do usuário" class="author-image">`);
    html.push(`<div class="author">${author}:</div>`);
    html.push(`</div>`);
    html.push(`<div class="timestamp">${timestamp}</div>`);
    html.push(`<div class="content">${formattedContent}</div>`);
    if (formattedEmbeds.length > 0) {
      html.push('<div class="embeds">');
      html.push('<h4>Embeds:</h4>');
      html.push(`${formattedEmbeds.join('')}`);
      html.push('</div>');
    }
    if (formattedAttachments.length > 0) {
      html.push('<div class="attachments">');
      html.push('<h4>Anexos:</h4>');
      html.push(`<ul>${formattedAttachments.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}</ul>`);
      html.push('</div>');
    }
    html.push('</div>');
  });

  html.push('</body>');
  html.push('</html>');

  const filePath = path.join(process.cwd(), fileName);
  fs.writeFileSync(filePath, html.join('\n'));

  console.log(`Mensagens salvas em ${filePath}`);
}