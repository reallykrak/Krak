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

    const userXp = db.get(xpKey) || 0;
    const userLevel = db.get(levelKey) || 1;
    const requiredXp = userLevel * client.config.levelXp;

    db.add(xpKey, client.config.mesajXp);

    if (userXp + client.config.mesajXp >= requiredXp) {
      db.set(levelKey, userLevel + 1);
      db.set(xpKey, 0);

      const levelUpEmbed = new EmbedBuilder()
        .setColor(client.config.successColor || "#00ff99")
        .setDescription(
          `🎉 | Tebrikler ${message.author}, **${userLevel + 1}** seviyesine ulaştın!`
        )
        .setFooter({ text: client.config.footer || "Level Sistemi" })
        .setTimestamp();

      message.channel.send({ embeds: [levelUpEmbed] });
    }

    // AFK ÇIKIŞ
    if (db.has(`afk_${userId}`)) {
      const afkSebep = db.get(`afk_${userId}`);
      const afkDate = db.get(`afkDate_${userId}`);
      const timeAgo = moment
        .duration(Date.now() - afkDate.date)
        .format("D [gün], H [saat], m [dakika], s [saniye]");

      db.delete(`afk_${userId}`);
      db.delete(`afkDate_${userId}`);

      const afkOut = new EmbedBuilder()
        .setColor("#57F287")
        .setDescription(`✅ | AFK modundan çıktınız. ${timeAgo} boyunca AFK'daydınız.`)
        .setFooter({ text: client.config.footer })
        .setTimestamp();

      message.reply({ embeds: [afkOut] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // MENTION AFK KONTROL
    if (message.mentions.users.size > 0) {
      const mentionedUser = message.mentions.users.first();

      if (db.has(`afk_${mentionedUser.id}`)) {
        const afkSebep = db.get(`afk_${mentionedUser.id}`);
        const afkDate = db.get(`afkDate_${mentionedUser.id}`);
        const timeAgo = moment
          .duration(Date.now() - afkDate.date)
          .format("D [gün], H [saat], m [dakika], s [saniye]");

        const afkInfo = new EmbedBuilder()
          .setColor("#5865F2")
          .setDescription(
            `ℹ️ | ${mentionedUser.tag} kullanıcısı **${timeAgo}** önce AFK oldu.\n📝 **Sebep:** ${afkSebep}`
          )
          .setFooter({ text: client.config.footer })
          .setTimestamp();

        message.reply({ embeds: [afkInfo] });
      }
    }
  },
};
