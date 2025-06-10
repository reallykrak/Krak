const {
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const db = require("croxydb");

module.exports = {
  name: "captcha",
  description: "Captcha sistemini yönetir.",
  type: 1,
  options: [
    {
      name: "ayarla",
      description: "Captcha sistemini ayarlar.",
      type: 1, // SUB_COMMAND
      options: [
        {
          name: "kanal",
          description: "Captcha mesajının gönderileceği kanal.",
          type: 7, // CHANNEL
          required: true,
        },
        {
          name: "rol",
          description: "Doğrulama sonrası verilecek rol.",
          type: 8, // ROLE
          required: true,
        },
      ],
    },
    {
      name: "kapat",
      description: "Captcha sistemini kapatır.",
      type: 1, // SUB_COMMAND
    },
    {
      name: "bilgi",
      description: "Ayarlı captcha sistemi hakkında bilgi verir.",
      type: 1, // SUB_COMMAND
    },
  ],
  run: async (client, interaction) => {
    // İkinci kodda bu yetki "Administrator" olarak belirlenmiş.
    // Birinci koddaki yapıya uygun olması için yetki kontrolünü başa ekliyoruz.
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return interaction.reply({
        content:
          "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setFooter({
      text: `${interaction.guild.name} • ${new Date().toLocaleDateString()}`,
    });

    if (subcommand === "ayarla") {
      const channel = interaction.options.getChannel("kanal");
      const role = interaction.options.getRole("rol");

      // croxydb'nin adı birinci kodda "db" olarak kullanıldığı için burada da "db" yapıldı.
      db.set(`captcha_${interaction.guild.id}`, {
        channelId: channel.id,
        roleId: role.id,
      });

      embed
        .setColor("#3498db")
        .setTitle("✅ Captcha Sistemi Ayarlandı")
        .addFields(
          { name: "Captcha Kanalı", value: channel.toString(), inline: true },
          { name: "Doğrulanmış Rol", value: role.toString(), inline: true }
        );

    } else if (subcommand === "kapat") {
      db.delete(`captcha_${interaction.guild.id}`);

      embed
        .setColor("#e74c3c")
        .setTitle("🗑️ Captcha Sistemi Kapatıldı")
        .setDescription("Sistem başarıyla devre dışı bırakıldı.");

    } else if (subcommand === "bilgi") {
      const captchaData = db.get(`captcha_${interaction.guild.id}`);

      if (!captchaData) {
        embed
          .setColor("#f1c40f")
          .setTitle("ℹ️ Captcha Sistemi Bilgisi")
          .setDescription("Bu sunucuda captcha sistemi aktif değil.");
      } else {
        const channel = interaction.guild.channels.cache.get(
          captchaData.channelId
        );
        const role = interaction.guild.roles.cache.get(captchaData.roleId);

        embed
          .setColor("#2ecc71")
          .setTitle("ℹ️ Captcha Sistemi Bilgisi")
          .addFields(
            {
              name: "Captcha Kanalı",
              value: channel ? channel.toString() : "Bulunamadı",
              inline: true,
            },
            {
              name: "Doğrulanmış Rol",
              value: role ? role.toString() : "Bulunamadı",
              inline: true,
            }
          );
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
        
