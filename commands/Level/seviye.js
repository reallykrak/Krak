const {
  Client,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const db = require("croxydb");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");
const config = require("../../config.json");
const voiceXpIntervals = new Map();

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

    try {
      const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
      const level = db.get(`level_${user.id}_${guildId}`) || 1;
      const requiredXp = level * (db.get(`xpKatsayisi_${guildId}`) || 100);
      const progress = Math.min((xp / requiredXp) * 100, 100);

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext("2d");

      // Arka plan görseli
      const background = await loadImage(path.join(__dirname, "../../image/level-card.png"));
      ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

      // Avatar
      let avatar;
      try {
        let avatarUrl = user.displayAvatarURL({ format: "png", size: 128 });
        if (avatarUrl.includes(".webp")) {
          avatarUrl = avatarUrl.replace(".webp", ".png");
        }
        avatar = await loadImage(avatarUrl);
      } catch {
        avatar = await loadImage("https://discordapp.com/assets/1f0bfc0865d324c2587920a7d80c609b.png");
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(100, 100, 75, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatar, 25, 25, 150, 150);
      ctx.restore();

      // XP bar
      ctx.fillStyle = "#4B5563"; // Arka bar (gri)
      ctx.fillRect(100, 250, 600, 40);

      ctx.fillStyle = "#4ADE80"; // Dolu bar (yeşil)
      ctx.fillRect(100, 250, (600 * progress) / 100, 40);

      // Yazılar (font kullanılmadan)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "40px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(user.tag, 200, 80);

      ctx.fillStyle = "#F472B6";
      ctx.font = "32px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`Seviye: ${level}`, 750, 150);

      ctx.fillStyle = "#E5E7EB";
      ctx.font = "24px sans-serif";
      ctx.fillText(`XP: ${xp}/${requiredXp}`, 750, 190);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(progress)}%`, 400, 275);

      ctx.fillStyle = "#9CA3AF";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Seviye Sistemi | ${config["bot-adi"]}`, 400, 380);

      const attachment = new AttachmentBuilder(canvas.toBuffer(), {
        name: "level-card.png",
      });
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error("Seviye kartı oluşturulurken hata:", error);
      await interaction.editReply({
        content: "Seviye kartı oluşturulurken bir hata oluştu. Tekrar deneyin!",
        ephemeral: true,
      });
    }
  },
};
