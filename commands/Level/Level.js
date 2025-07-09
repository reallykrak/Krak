const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const path = require("path");
const db = require("croxydb");

module.exports = {
  name: "Level",
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

    // Arka plan olarak image/level-card.png
    const background = await loadImage(path.join(__dirname, "../../image/level-card.png"));
    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext("2d");

    // Arka plan çizimi
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // BAR: Yeşil doluluk (örnek konumlar, kendi görseline göre AYARLA)
    const barX = 140;  // barın başladığı X (GÖRSELDEKİ yeşil bar boşluğu)
    const barY = 300;  // barın Y konumu
    const barWidth = 500; // Toplam genişlik
    const barHeight = 20; // Bar yüksekliği

    const filledWidth = barWidth * progress;

    // Bar dolu kısmı
    ctx.fillStyle = "#00ff66";
    ctx.fillRect(barX, barY, filledWidth, barHeight);

    // Yüzde metni
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight + 20);

    // Profil avatarı (örnek: sol üst)
    const avatar = await loadImage(user.displayAvatarURL({ extension: "png", size: 512 }));
    const avatarSize = 100;
    const avatarX = 40;
    const avatarY = 40;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Kullanıcı adı (avatarın yanına)
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(user.username, avatarX + avatarSize + 20, avatarY + 60);

    // Seviye bilgisi (görselin sağ üstü)
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Seviye: ${level}`, canvas.width - 40, 60);

    // XP bilgisi
    ctx.fillStyle = "#66ccff";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`XP: ${xp}/${xpToNextLevel}`, canvas.width - 40, 100);

    const buffer = canvas.toBuffer("image/png");
    const attachment = new AttachmentBuilder(buffer, { name: "level-card.png" });

    await interaction.reply({ files: [attachment] });
  }
};
