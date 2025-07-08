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

      const levelEmbed = new EmbedBuilder()
        .setColor(client.config.successColor)
        .setDescription(`🎉 | Tebrikler ${message.author}, **${userLevel + 1}** seviyesine ulaştın!`)
        .setFooter({ text: client.config.footer })
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
        .setColor(client.config.successColor)
        .setDescription(`✅ | AFK modundan çıktınız. ${timeAgo} boyunca AFK'daydınız.`)
        .setFooter({ text: client.config.footer })
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
          .setColor(client.config.embedColor)
          .setDescription(
            `ℹ️ | ${mentionedUser.tag} kullanıcısı **${timeAgo}** önce AFK oldu.\n\n📝 **Sebep:** ${afkSebep}`
          )
          .setFooter({ text: client.config.footer })
          .setTimestamp();

        message.reply({ embeds: [mentionEmbed] });
      }
    }
  },
};
