const {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  AttachmentBuilder,
} = require("discord.js");
const Jimp = require("jimp");
const db = require("croxydb");
const path = require("path");
const config = require("../../config.json");

module.exports = {
  name: "seviye",
  description: "Seviye bilgilerini görsel olarak gösterir!",
  type: ApplicationCommandType.ChatInput,
  cooldown: 5,
  options: [
    {
      name: "kullanıcı",
      description: "Seviyesi görüntülenecek kullanıcı",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const user = interaction.options.getUser("kullanıcı") || interaction.user;
    const guildId = interaction.guild.id;

    const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
    const level = db.get(`level_${user.id}_${guildId}`) || 1;
    const requiredXp = level * (db.get(`xpKatsayisi_${guildId}`) || 100);
    const progress = Math.min((xp / requiredXp), 1);

    // Boyutlar
    const width = 800;
    const height = 400;
    const progressBarWidth = 600;
    const progressBarHeight = 40;

    try {
      const background = new Jimp(width, height, "#0A0A23");
      const avatarUrl = user.displayAvatarURL({ format: "png", size: 128 });
      const avatar = await Jimp.read(avatarUrl);

      avatar.circle(); // Yuvarlak avatar
      background.composite(avatar, 25, 25);

      const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
      const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

      // Kullanıcı adı
      background.print(fontTitle, 200, 40, user.tag);

      // Seviye bilgisi
      background.print(fontSubtitle, 600, 150, `Seviye: ${level}`);
      background.print(fontSubtitle, 600, 180, `XP: ${xp}/${requiredXp}`);

      // İlerleme çubuğu zemin
      background.scan(
        100, 250, progressBarWidth, progressBarHeight,
        (x, y, idx) => {
          background.bitmap.data.writeUInt32BE(0xFF4B5563, idx); // Gri renk
        }
      );

      // İlerleme çubuğu dolu kısmı
      background.scan(
        100, 250, progressBarWidth * progress, progressBarHeight,
        (x, y, idx) => {
          background.bitmap.data.writeUInt32BE(0xFF4ADE80, idx); // Yeşil renk
        }
      );

      // Yüzdelik
      background.print(fontSubtitle, 370, 260, `${Math.round(progress * 100)}%`);

      // Alt açıklama
      background.print(
        fontSubtitle,
        200,
        360,
        {
          text: `Seviye Sistemi | ${config["bot-adi"]}`,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        400,
        20
      );

      const buffer = await background.getBufferAsync(Jimp.MIME_PNG);
      const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });

      await interaction.editReply({ files: [attachment] });

    } catch (err) {
      console.error("Jimp ile görsel oluşturulamadı:", err);
      await interaction.editReply({
        content: "Seviye kartı oluşturulurken bir hata oluştu.",
        ephemeral: true,
      });
    }
  },
};
