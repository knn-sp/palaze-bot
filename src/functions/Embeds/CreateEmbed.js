import { EmbedBuilder } from "discord.js";

export function createEmbed(options) {
  const {
    title,
    description,
    color,
    thumbnail,
    image,
    author,
    footer,
    fields,
    attachment
  } = options;

  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color) embed.setColor(color);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) {
    if (author.name) embed.setAuthor(author.name, author.iconURL, author.url);
    if (author.iconURL && !author.name) embed.setAuthor('', author.iconURL, author.url);
  }
  if (footer) {
    if (footer.text) embed.setFooter(footer.text, footer.iconURL);
    if (footer.iconURL && !footer.text) embed.setFooter('', footer.iconURL);
  }
  if (fields && fields.length > 0) {
    const embedFields = fields.map(field => {
      if (!field.name || !field.value) return;
      return {
        name: field.name,
        value: field.value,
        inline: field.inline ?? false
      }
    });
    embed.addFields(embedFields);
  }
  if (attachment) {
    const attachmentName = attachment.split('/').pop();
    const attachmentFile = new Attachment(attachment);
    embed.attachFiles([attachmentFile])
      .setFooter(`Attachment: ${attachmentName}`);
  }

  return embed;
}

export function advancedFormatEmbed(embed) {
  const title = embed.title ? `<div class="embed-title">${embed.title}</div>` : '';
  const description = embed.description ? `<div class="embed-description">${embed.description}</div>` : '';
  const fields = embed.fields.map((field) => `<div class="embed-field"><div class="embed-field-name">${field.name}</div><div class="embed-field-value">${field.value}</div></div>`).join('');

  let colorOption = '';
  if (embed.color) {
    colorOption = `<div class="embed-option">Color: ${embed.color}</div>`;
  }

  let imageOption = '';
  if (embed.image) {
    imageOption = `<div class="embed-option">Image: ${embed.image.url}</div>`;
  }

  let thumbnailOption = '';
  if (embed.thumbnail) {
    thumbnailOption = `<div class="embed-option">Thumbnail: ${embed.thumbnail.url}</div>`;
  }

  let footerOption = '';
  if (embed.footer) {
    footerOption = `<div class="embed-option">Footer: ${embed.footer.text}</div>`;
  }

  let timestampOption = '';
  if (embed.timestamp) {
    timestampOption = `<div class="embed-option">Timestamp: ${embed.timestamp}</div>`;
  }

  let authorOption = '';
  if (embed.author) {
    authorOption = `<div class="embed-option">Author: ${embed.author.name}</div>`;
  }

  let fieldsOption = '';
  if (embed.fields.length > 0) {
    fieldsOption = `<div class="embed-option">Fields: ${embed.fields.length}</div>`;
  }

  return `
    <div class="embed">
      ${title}
      ${description}
      ${fields}
      ${colorOption}
      ${imageOption}
      ${thumbnailOption}
      ${footerOption}
      ${timestampOption}
      ${authorOption}
      ${fieldsOption}
    </div>
  `;
}