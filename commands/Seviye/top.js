const Jimp = require("jimp");

const generateLeaderboardImage = async (page) => {
  const start = page * pageSize;
  const end = start + pageSize;
  const pageData = sortedData.slice(start, end);

  // Boş 800x600 resim (arka plan rengi #0A0A23)
  const image = new Jimp(800, 600, "#0A0A23");

  // Üst çubuk (mavi)
  image.scan(0, 0, 800, 80, function (x, y, idx) {
    this.bitmap.data.writeUInt32BE(0x2563ebff, idx); // #2563EB
  });

  // Başlık yazısı
  const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
  image.print(
    fontTitle,
    0,
    20,
    {
      text: "🏆 Seviye Sıralaması",
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
    },
    800,
    40
  );

  // Sunucu ikonu (yuvarlak)
  if (interaction.guild.iconURL()) {
    try {
      let iconUrl = interaction.guild.iconURL({ extension: "png", size: 64 });
      const icon = await Jimp.read(iconUrl);
      // Mask için yuvarlak oluştur
      const mask = await new Jimp(60, 60, 0x00000000);
      mask.scan(0, 0, 60, 60, function (x, y, idx) {
        const rx = x - 30;
        const ry = y - 30;
        if (rx * rx + ry * ry <= 30 * 30) {
          this.bitmap.data[idx + 3] = 255;
        }
      });
      icon.resize(60, 60);
      icon.mask(mask, 0, 0);
      image.composite(icon, 30, 10);
    } catch (e) {
      console.error("Sunucu ikonu yüklenemedi:", e);
    }
  }

  // Yazılar ve kullanıcı avatarları
  const fontUser = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
  const fontUserSmall = await Jimp.loadFont(Jimp.FONT_SANS_14_WHITE);
  const fontProgress = await Jimp.loadFont(Jimp.FONT_SANS_12_WHITE);

  const startY = 110;
  const entryHeight = 85;

  for (let i = 0; i < pageData.length; i++) {
    const data = pageData[i];
    const positionY = startY + i * entryHeight;
    const rank = start + i + 1;

    // Arka plan satırı
    const bgColor = rank % 2 === 0 ? "#111827" : "#1F2937";
    const bgRect = new Jimp(760, entryHeight - 10, bgColor);
    image.composite(bgRect, 20, positionY);

    // Sıra numarası kutusu
    const rankColor = getRankColor(rank);
    const rankRect = new Jimp(60, entryHeight - 10, rankColor);
    image.composite(rankRect, 20, positionY);

    // Sıra numarası yazısı
    image.print(
      fontUser,
      20,
      positionY + 30,
      {
        text: `#${rank}`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      },
      60,
      entryHeight - 10
    );

    // Kullanıcı avatarı
    try {
      const user = await client.users.fetch(data.userId).catch(() => null);
      if (!user) continue;

      let avatarURL = user.displayAvatarURL({ extension: "png", size: 64 });
      const avatar = await Jimp.read(avatarURL);
      avatar.resize(50, 50);

      // Yuvarlak avatar maskesi
      const mask = await new Jimp(50, 50, 0x00000000);
      mask.scan(0, 0, 50, 50, function (x, y, idx) {
        const rx = x - 25;
        const ry = y - 25;
        if (rx * rx + ry * ry <= 25 * 25) {
          this.bitmap.data[idx + 3] = 255;
        }
      });
      avatar.mask(mask, 0, 0);
      image.composite(avatar, 90, positionY + 12);
    } catch {
      // Avatar yüklenmezse kullanıcı adının ilk harfi
      image.print(
        fontUser,
        90,
        positionY + 30,
        data.userId.charAt(0).toUpperCase()
      );
    }

    // Kullanıcı ismi ve seviye bilgisi
    const requiredXp = data.level * (client.config?.levelXp || 100);
    const progress = Math.min((data.xp / requiredXp) * 100, 100);

    image.print(fontUser, 150, positionY + 10, user.tag || "Bilinmiyor");
    image.print(
      fontUserSmall,
      150,
      positionY + 35,
      `Seviye: ${data.level} • XP: ${data.xp}/${requiredXp}`
    );

    // XP bar
    const barBg = new Jimp(350, 15, "#4B5563");
    image.composite(barBg, 400, positionY + 40);

    const barFill = new Jimp((350 * progress) / 100, 15, "#4ADE80");
    image.composite(barFill, 400, positionY + 40);

    image.print(
      fontProgress,
      400,
      positionY + 40,
      {
        text: `${Math.round(progress)}%`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_RIGHT,
      },
      350,
      15
    );
  }

  // Footer vs. aynı mantıkla yapılabilir.

  return await image.getBufferAsync(Jimp.MIME_PNG);
};

function getRankColor(rank) {
  switch (rank) {
    case 1:
      return "#FFD700";
    case 2:
      return "#C0C0C0";
    case 3:
      return "#CD7F32";
    default:
      return "#3B82F6";
  }
      }
