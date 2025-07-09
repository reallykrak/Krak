const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const db = require("croxydb");

module.exports = {
  name: "level",
  description: "Kullanıcının seviye kartını gösterir.",
  type: 1,
  run: async (client, interaction) => {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
    const level = db.get(`level_${user.id}_${guildId}`) || 1;
    const xpToNextLevel = 100;
    const progress = Math.min(xp / xpToNextLevel, 1);
    const percentage = Math.floor(progress * 100);

    // Yeni görseli yükle (senin attığın image/level-card.png)
    const background = await loadImage(path.join(__dirname, "../../image/level-card.png"));
    const width = background.width;
    const height = background.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Arka plan çiz
    ctx.drawImage(background, 0, 0, width, height);

    // Avatar yükle
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarURL);

    const avatarX = 40;
    const avatarY = 40;
    const avatarSize = 150;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Kullanıcı ismi
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(user.username, avatarX + avatarSize + 20, avatarY + avatarSize / 1.5);

    // Bar (XP ilerlemesi)
    const barX = 100;
    const barY = 580;
    const barWidth = 570;
    const barHeight = 50;
    const filledWidth = barWidth * progress;

    // Yeşil doluluk
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    // Yüzde yazısı
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2);

    // Sağda Seviye ve XP yazıları
    ctx.fillStyle = "#ff66cc";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Seviye: ${level}`, width - 80, 450);

    ctx.fillStyle = "#99ccff";
    ctx.font = "28px sans-serif";
    ctx.fillText(`XP: ${xp}/${xpToNextLevel}`, width - 80, 490);

    // PNG olarak gönder
    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: "level-card.png",
    });

    await interaction.reply({ files: [attachment] });
  },
};
