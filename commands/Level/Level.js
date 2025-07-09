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
    const level = db.get(`level_${user.id}_${guildId}`) || 0;
    const xpToNextLevel = 100;
    const progress = Math.min(xp / xpToNextLevel, 1);
    const percentage = Math.floor(progress * 100);

    const background = await loadImage(path.join(__dirname, "../../image/level-card.png"));
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    // Arka plan
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Avatar
    const avatarURL = user.displayAvatarURL({ extension: "png", size: 512 });
    const avatar = await loadImage(avatarURL);

    const avatarSize = 150;
    const avatarX = 40;
    const avatarY = 40;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Kullanıcı adı
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(user.username, avatarX + avatarSize + 30, avatarY + 70);

    // XP barı
    const barX = 60;
    const barY = 250;
    const barWidth = 600;
    const barHeight = 40;

    // Boş bar
    ctx.fillStyle = "#444";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Dolu bar
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);

    // Bar üzerindeki yüzde
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2 + 8);

    // Sağ alt: Seviye
    ctx.fillStyle = "#ff66cc";
    ctx.font = "bold 30px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Seviye: ${level}`, canvas.width - 60, barY - 20);

    // Sağ alt: XP
    ctx.fillStyle = "#66ccff";
    ctx.font = "24px sans-serif";
    ctx.fillText(`XP: ${xp}/${xpToNextLevel}`, canvas.width - 60, barY + barHeight + 30);

    // Son olarak resmi gönder
    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });

    await interaction.reply({ files: [attachment] });
  }
};
