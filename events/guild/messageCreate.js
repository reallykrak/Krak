const db = require("croxydb");
const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
require("moment-duration-format");
moment.locale("tr");

module.exports = {
  name: "messageCreate",
  once: false,
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    const xpKey = `xp_${userId}_${guildId}`;
    const levelKey = `level_${userId}_${guildId}`;
    let userXp = db.get(xpKey) || 0;
    let userLevel = db.get(levelKey) || 1;
    const xpToNextLevel = 100; // Her seviye için gereken XP sabit: 100

    // XP ekle
    userXp += 1;
    db.set(xpKey, userXp);

    // Seviye atlama kontrolü
    if (userXp >= xpToNextLevel) {
      userLevel += 1;
      db.set(levelKey, userLevel);
      db.set(xpKey, 0);

      const levelEmbed = new EmbedBuilder()
        .setColor(client.config?.successColor || "#00ff99")
        .setDescription(`🎉 | Tebrikler ${message.author}, **${userLevel}** seviyesine ulaştın!`)
        .setFooter({ text: client.config?.footer || "Seviye Sistemi" })
        .setTimestamp();

      message.channel.send({ embeds: [levelEmbed] });
    }

    // AFK çıkışı
    if (db.has(`afk_${userId}`)) {
      const afkSebep = db.get(`afk_${userId}`);
      const afkDate = db.get(`afkDate_${userId}`);
      const timeAgo = moment
        .duration(Date.now() - afkDate.date)
        .format("D [gün], H [saat], m [dakika], s [saniye]");

      db.delete(`afk_${userId}`);
      db.delete(`afkDate_${userId}`);

      const afkOut = new EmbedBuilder()
        .setColor(client.config?.successColor || "#00ff99")
        .setDescription(`✅ | AFK modundan çıktınız. ${timeAgo} boyunca AFK'daydınız.`)
        .setFooter({ text: client.config?.footer || "AFK Sistemi" })
        .setTimestamp();

      message.reply({ embeds: [afkOut] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // AFK kullanıcıya mention varsa göster
    if (message.mentions.users.size > 0) {
      const mentionedUser = message.mentions.users.first();

      if (db.has(`afk_${mentionedUser.id}`)) {
        const afkSebep = db.get(`afk_${mentionedUser.id}`);
        const afkDate = db.get(`afkDate_${mentionedUser.id}`);
        const timeAgo = moment
          .duration(Date.now() - afkDate.date)
          .format("D [gün], H [saat], m [dakika], s [saniye]");

        const mentionEmbed = new EmbedBuilder()
          .setColor(client.config?.embedColor || "#ffaa00")
          .setDescription(
            `ℹ️ | ${mentionedUser.tag} kullanıcısı **${timeAgo}** önce AFK oldu.\n\n📝 **Sebep:** ${afkSebep}`
          )
          .setFooter({ text: client.config?.footer || "AFK Sistemi" })
          .setTimestamp();

        message.reply({ embeds: [mentionEmbed] });
      }
    }
  },
};
