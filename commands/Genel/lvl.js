const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const db = require("croxydb");

module.exports = {
  name: "lvl",
  description: "Seviye kartını şablon üzerine çizerek gönderir.",
  type: 1,
  run: async (client, interaction) => {
    const user = interaction.user;
    const guildId = interaction.guild.id;

    const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
    const level = db.get(`level_${user.id}_${guildId}`) || 1;
    const xpToNextLevel = 100;
    const progress = Math.min(xp / xpToNextLevel, 1);
    const percentage = Math.floor(progress * 100);

    // 1. Şablonu yükle
    const background = await loadImage(path.join(__dirname, "../../image/level.png"));
    const width = background.width;
    const height = background.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 2. Arka planı çiz
    ctx.drawImage(background, 0, 0, width, height);

    // 3. Avatarı çiz
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);

    const avatarX = 60;
    const avatarY = 60;
    const avatarSize = 120;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // 4. Yeşil ilerleme barı
    const barX = 150;
    const barY = 480;
    const barWidth = 470;
    const barHeight = 50;
    const filledWidth = barWidth * progress;

    ctx.fillStyle = "#00ff99";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    // 5. Çıktıyı gönder
    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });

    await interaction.reply({ files: [attachment] });
  }
};
