const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const db = require("croxydb");

module.exports = {
  name: "lvl",
  description: "Seviye kartını şablon üzerine çizer.",
  type: 1,
  run: async (client, interaction) => {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
    const level = db.get(`level_${user.id}_${guildId}`) || 1;
    const xpToNextLevel = 100;
    const progress = Math.min(xp / xpToNextLevel, 1);
    const percentage = Math.floor(progress * 100);

    const background = await loadImage(path.join(__dirname, "../../image/level.png"));
    const width = background.width;
    const height = background.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Arka plan çiz
    ctx.drawImage(background, 0, 0, width, height);

    // 2. Avatar
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatar = await loadImage(avatarURL);

    const avatarSize = 200;
    const avatarX = 480;
    const avatarY = 520;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // 3. Bar (daha büyük ve aşağıda)
    const barX = 100;
    const barY = 660;
    const barWidth = 570;
    const barHeight = 60;
    const filledWidth = barWidth * progress;

    // Barın dolu kısmı (yeşil)
    ctx.fillStyle = "#00ff99";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    // 4. Bar üstüne yüzde metni
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2);

    // 5. Sonuç gönder
    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, {
      name: "level-card.png",
    });

    await interaction.reply({ files: [attachment] });
  },
};
