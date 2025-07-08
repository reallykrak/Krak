const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const db = require("croxydb");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lvl")
    .setDescription("Seviye kartını göster."),

  async execute(interaction) {
    const user = interaction.user;
    const userId = user.id;
    const guildId = interaction.guild.id;
    const key = `${guildId}_${userId}`;
    const userData = db.get(key) || { xp: 0, level: 1 };

    // Kart boyutu
    const width = 1000;
    const height = 300;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Arka plan görseli
    const bg = await loadImage(path.join(__dirname, "../../image/card-bg.png"));
    ctx.drawImage(bg, 0, 0, width, height);

    // XP bar (konum ve ölçü)
    const barX = 85;
    const barY = 230;
    const barWidth = 830;
    const barHeight = 15;
    const radius = 7.5;

    // XP doluluk
    const progress = Math.min(userData.xp / 100, 1);
    const filledWidth = barWidth * progress;

    // Dolan bar (yeşil)
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

    // Yazılar
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`SEVİYE: ${userData.level}`, 80, 70);
    ctx.fillText(`XP: ${userData.xp}/100`, 80, 120);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });
    await interaction.reply({ files: [attachment] });
  }
};
