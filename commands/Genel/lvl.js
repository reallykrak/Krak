const {
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");
const {
    createCanvas,
    loadImage
} = require("@napi-rs/canvas");
const db = require("croxydb");
const path = require("path");

function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    return ctx;
}

module.exports = {
    name: "lvl",
    description: "Seviye kartını görsel olarak gösterir.",
    type: 1,
    run: async (client, interaction) => {
        const user = interaction.user;
        const guildId = interaction.guild.id;

        const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
        const level = db.get(`level_${user.id}_${guildId}`) || 1;
        const xpToNextLevel = 100;

        const width = 934;
        const height = 282;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // 1. Arka plan resmi yükle
        const background = await loadImage(path.join(__dirname, "../../image/level.png"));
        ctx.drawImage(background, 0, 0, width, height); // Arka plan olarak çiz

        // 2. Avatar yükle
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarURL);

        const pfpSize = 180;
        const pfpX = 50;
        const pfpY = (height - pfpSize) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, pfpX, pfpY, pfpSize, pfpSize);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2, true);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 10;
        ctx.stroke();
        ctx.closePath();

        // 3. XP Barı çiz
        const barWidth = 580;
        const barHeight = 60;
        const barX = pfpX + pfpSize + 40;
        const barY = (height - barHeight) / 2;

        const progress = Math.min(xp / xpToNextLevel, 1);
        const filledWidth = barWidth * progress;
        const percentage = Math.floor(progress * 100);

        // Gri bar (boş kısım)
        ctx.fillStyle = "#484b4e";
        roundRect(ctx, barX, barY, barWidth, barHeight, 30).fill();

        // Yeşil bar (doluluk)
        if (filledWidth > 0) {
            ctx.fillStyle = "#00ff99";
            roundRect(ctx, barX, barY, filledWidth, barHeight, 30).fill();
        }

        // 4. Yüzde metni
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 35px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2);

        // 5. Ek bilgiler
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(user.username, barX, barY - 55);

        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#A9A9A9';
        ctx.fillText(`Seviye: ${level} | XP: ${xp} / ${xpToNextLevel}`, barX, barY + barHeight + 10);

        // 6. Gönder
        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, {
            name: "level-card.png"
        });

        await interaction.reply({ files: [attachment] });
    }
};
