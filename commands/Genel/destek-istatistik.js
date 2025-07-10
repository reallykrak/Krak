const { EmbedBuilder, ApplicationCommandType, PermissionsBitField } = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "destek-istatistik",
  description: "Sunucudaki destek sistemi istatistiklerini gösterir.",
  type: ApplicationCommandType.ChatInput,
  cooldown: 10,
  
  run: async (client, interaction) => {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({
        content: "❌ | Bu komutu kullanmak için `Sunucuyu Yönet` yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const stats = db.get(`destek_stats_${interaction.guild.id}`);

    if (!stats) {
      return interaction.reply({
        content: "❌ | Bu sunucuda henüz görüntülenecek destek istatistiği bulunmuyor.",
        ephemeral: true,
      });
    }

    const totalTickets = stats.totalTickets || 0;
    const closedTickets = stats.closedTickets || 0;
    const ratings = stats.ratings || [];
    const averageRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "Puanlama Yok";
    
    const openTickets = totalTickets - closedTickets;

    const embed = new EmbedBuilder()
      .setTitle(`📊 Destek Sistemi İstatistikleri - ${interaction.guild.name}`)
      .setColor("Blue")
      .addFields(
        { name: "📬 Toplam Oluşturulan Talep", value: `**${totalTickets}** adet`, inline: true },
        { name: "✅ Kapatılan Talep", value: `**${closedTickets}** adet`, inline: true },
        { name: "🕒 Açık Talep", value: `**${openTickets}** adet`, inline: true },
        { name: "⭐ Ortalama Puan", value: `**${averageRating} / 5.0**`, inline: false },
      )
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp()
      .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed] });
  },
};
      
