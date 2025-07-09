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

    const background = await loadImage(path.join(__dirname, "../../image/level-card.png"));
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    // Arka plan çiz
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Avatar
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 512 });
    const avatar = await loadImage(avatarURL);

    const avatarSize = 128;
    const avatarX = 40;
    const avatarY = 40;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Kullanıcı adı
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(user.username, avatarX + avatarSize + 20, avatarY + 60);

    // XP bar
    const barX = 60;
    const barY = 200;
    const barWidth = 600;
    const barHeight = 40;
    const filledWidth = barWidth * progress;

    // Arka çerçeve
    ctx.fillStyle = "#333333";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Dolu yeşil kısım
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    // Yüzde
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2 + 8);

    // Sağ alt: Seviye
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Seviye: ${level}`, canvas.width - 60, barY - 10);

    // Sağ alt: XP
    ctx.fillStyle = "#66ccff";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`XP: ${xp}/${xpToNextLevel}`, canvas.width - 60, barY + barHeight + 30);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });

    await interaction.reply({ files: [attachment] });
  }
};
