const {
    EmbedBuilder,
    AttachmentBuilder
} = require("discord.js");
const {
    createCanvas,
    loadImage
} = require("@napi-rs/canvas");
const db = require("croxydb");

// Yuvarlak köşeli dikdörtgen çizmek için yardımcı bir fonksiyon
// Bu, canvas'ta varsayılan olarak bulunmadığı için kullanışlıdır.
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
        // Komutu kullanan kullanıcıyı ve sunucuyu al
        const user = interaction.user;
        const guildId = interaction.guild.id;

        // Veritabanından kullanıcının XP ve Seviye bilgilerini çek
        // Eğer veri yoksa varsayılan olarak 0 XP ve 1. Seviye ata
        const xp = db.get(`xp_${user.id}_${guildId}`) || 0;
        const level = db.get(`level_${user.id}_${guildId}`) || 1;
        const xpToNextLevel = 100; // Bir sonraki seviye için gereken XP (isteğe göre değiştirebilirsiniz)

        // Canvas boyutlarını ayarla
        const width = 934;
        const height = 282;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext("2d");

        // 1. Arka Plan
        // Gönderdiğiniz resimdeki gibi koyu mavi bir arka plan oluştur
        ctx.fillStyle = "#1e2a47";
        ctx.fillRect(0, 0, width, height);

        // 2. Profil Fotoğrafı
        // Kullanıcının avatarını PNG formatında al
        const avatarURL = user.displayAvatarURL({
            extension: 'png',
            size: 256
        });
        const avatar = await loadImage(avatarURL);

        const pfpSize = 180; // Profil fotoğrafı boyutu
        const pfpX = 50;
        const pfpY = (height - pfpSize) / 2;

        // Avatarı dairesel yapmak için bir maske oluştur
        ctx.save();
        ctx.beginPath();
        ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip(); // Bu alanın dışındaki her şeyi kes

        // Avatarı çiz
        ctx.drawImage(avatar, pfpX, pfpY, pfpSize, pfpSize);
        ctx.restore(); // Maskeyi kaldır

        // Profil fotoğrafının etrafına siyah bir çerçeve ekle
        ctx.beginPath();
        ctx.arc(pfpX + pfpSize / 2, pfpY + pfpSize / 2, pfpSize / 2, 0, Math.PI * 2, true);
        ctx.strokeStyle = '#000000'; // Çerçeve rengi
        ctx.lineWidth = 10; // Çerçeve kalınlığı
        ctx.stroke();
        ctx.closePath();


        // 3. XP İlerleme Çubuğu
        const barWidth = 580;
        const barHeight = 60;
        const barX = pfpX + pfpSize + 40;
        const barY = (height - barHeight) / 2;
        const cornerRadius = 30;

        // İlerleme yüzdesini hesapla
        const progress = Math.min(xp / xpToNextLevel, 1); // Değerin 1'i geçmediğinden emin ol
        const filledWidth = barWidth * progress;
        const percentage = Math.floor(progress * 100);

        // Çubuğun arka planını (gri kısım) çiz
        ctx.fillStyle = "#484b4e";
        roundRect(ctx, barX, barY, barWidth, barHeight, cornerRadius).fill();

        // Çubuğun dolan kısmını (yeşil kısım) çiz
        // Sadece doluluk varsa çiz, 0 ise çizme
        if (filledWidth > 0) {
            ctx.fillStyle = "#00ff99"; // Yeşil dolgu rengi
            roundRect(ctx, barX, barY, filledWidth, barHeight, cornerRadius).fill();
        }

        // 4. Yüzde Metni
        // Metni çubuğun tam ortasına yazdır
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 35px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${percentage}%`, barX + barWidth / 2, barY + barHeight / 2);
        
        // 5. Seviye ve Kullanıcı Adı gibi ek metinler (İsteğe Bağlı)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(user.username, barX, barY - 55);

        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#A9A9A9'; // Gri renk
        ctx.fillText(`Seviye: ${level} | XP: ${xp} / ${xpToNextLevel}`, barX, barY + barHeight + 10);


        // 6. Sonucu Gönder
        // Canvas'ı bir buffer'a çevirip Discord'a dosya olarak gönder
        const buffer = canvas.toBuffer("image/png");
        const attachment = new AttachmentBuilder(buffer, {
            name: "level-card.png"
        });

        await interaction.reply({
            files: [attachment]
        });
    }
};
      
