const {
  EmbedBuilder,
  AttachmentBuilder
} = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const db = require("croxydb");

module.exports = {
  name: "lvl",
  description: "Seviye kartını görsel olarak gösterir.",
  type: 1,
  run: async (client, interaction) => {
    const user = interaction.user;
    const guildId = interaction.guild.id;
    const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
    const level = db.get(`level_${user.id}_${guildId}`) || 1;

    const width = 1000;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Arka plan
    const bgPath = path.join(__dirname, "../../image/level-card.png");
    const background = await loadImage(bgPath);
    ctx.drawImage(background, 0, 0, width, height);

    // Bar konumu ve stil
    const barX = 85;
    const barY = 230;
    const barWidth = 830;
    const barHeight = 15;
    const radius = 7.5;

    const progress = Math.min(xp / 100, 1); // 0 ile 1 arası
    const filledWidth = barWidth * progress;

    // XP bar
    ctx.fillStyle = "#00ff99";
    ctx.beginPath();
    ctx.moveTo(barX + radius, barY);
    ctx.lineTo(barX + filledWidth - radius, barY);
    ctx.quadraticCurveTo(barX + filledWidth, barY, barX + filledWidth, barY + radius);
    ctx.lineTo(barX + filledWidth, barY + barHeight - radius);
    ctx.quadraticCurveTo(barX + filledWidth, barY + barHeight, barX + filledWidth - radius, barY + barHeight);
    ctx.lineTo(barX + radius, barY + barHeight);
    ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius);
    ctx.lineTo(barX, barY + radius);
    ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
    ctx.closePath();
    ctx.fill();

    // Metinler
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`SEVİYE`, width - 140, 50);
    ctx.fillText(`${level}`, width - 100, 90);
    ctx.fillText(`XP`, width - 140, 160);
    ctx.fillText(`${xp}/100`, width - 160, 200);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level.png" });

    await interaction.reply({ files: [attachment] });
  }
};
