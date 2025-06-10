const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, AttachmentBuilder } = require("discord.js");
const Jimp = require("jimp");
const path = require("path");

module.exports = {
  name: "aranıyor",
  description: "Kullanıcı için aranıyor posteri oluşturur!",
  type: ApplicationCommandType.ChatInput,
  cooldown: 5,
  options: [
    {
      name: "kullanıcı",
      description: "Poster için kullanıcı",
      type: ApplicationCommandOptionType.User,
      required: false
    },
    {
      name: "ödül",
      description: "Yakalayana verilecek ödül miktarı (1-1000000)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
      minValue: 1,
      maxValue: 1000000
    },
    {
      name: "suç",
      description: "İşlenen suç",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();

    const kullanıcı = interaction.options.getUser("kullanıcı") || interaction.user;
    const ödül = interaction.options.getInteger("ödül") || 5000;
    const suç = interaction.options.getString("suç") || "Discord'da kaybolmak";

    try {
      const width = 800;
      const height = 1000;

      const background = await Jimp.read(path.join(__dirname, "../images/background.png"));
      const poster = background.resize(width, height);

      // Avatarı oku
      let avatar;
      try {
        const avatarUrl = kullanıcı.displayAvatarURL({ extension: 'png', size: 512 });
        avatar = await Jimp.read(avatarUrl);
        avatar.resize(300, 300).circle();
      } catch (err) {
        avatar = await Jimp.read(path.join(__dirname, "../images/no-avatar.png"));
        avatar.resize(300, 300).circle();
      }

      // "ARANIYOR" başlığı
      poster.print(fontTitle, 0, 60, {
        text: "ARANIYOR",
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      poster.print(fontSub, 0, 140, {
        text: "ÖLÜ VEYA DİRİ",
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      // Avatarı yerleştir
      poster.composite(avatar, (width - 300) / 2, 250);

      // Kullanıcı adı
      poster.print(fontSub, 0, 580, {
        text: kullanıcı.username,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      // SUÇ başlığı
      poster.print(fontSub, 0, 640, {
        text: "SUÇ:",
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      // Suç metni (çok satırlı destekli)
      const suçLines = wrapText(suç, 40); // max 40 karakter satır başı
      let y = 680;
      for (const line of suçLines) {
        poster.print(fontItalic, 0, y, {
          text: line,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
        }, width);
        y += 40;
      }

      // ÖDÜL başlığı
      y += 20;
      poster.print(fontTitle, 0, y, {
        text: "ÖDÜL:",
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      // Ödül miktarı
      y += 60;
      poster.print(fontTitle, 0, y, {
        text: `${ödül.toLocaleString()} TL`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
      }, width);

      // Buffer oluştur
      const buffer = await poster.getBufferAsync(Jimp.MIME_PNG);
      const attachment = new AttachmentBuilder(buffer, { name: 'araniyor.png' });

      const embed = new EmbedBuilder()
        .setColor("#8B4513")
        .setTitle(`${kullanıcı.username} İçin Aranıyor Posteri`)
        .setDescription(`**${kullanıcı.username}** için aranıyor posteri oluşturuldu!`)
        .setImage('attachment://araniyor.png')
        .setFooter({ text: client.config.footer })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed], files: [attachment] });

    } catch (error) {
      console.error("Jimp poster hatası:", error);
      await interaction.editReply({ content: `Poster oluşturulurken hata oluştu: ${error.message}` });
    }
  }
};

// Basit text wrap fonksiyonu
function wrapText(text, maxLen) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + word).length > maxLen) {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line += word + ' ';
    }
  }
  lines.push(line.trim());
  return lines;
    }
