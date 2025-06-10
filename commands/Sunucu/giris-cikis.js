const {
  Client,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const db = require("croxydb");

module.exports = [
  {
    name: "giriş-çıkış",
    description:
      "Kullanıcı giriş-çıkış mesajlarının gönderileceği kanalı ayarlar!",
    type: 1,
    options: [
      {
        name: "kanal",
        description: "Giriş-çıkış mesajlarının gönderileceği kanal",
        type: 7,
        required: true,
        channel_types: [ChannelType.GuildText],
      },
    ],
    run: async (client, interaction) => {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!",
          ephemeral: true,
        });
      }

      const kanal = interaction.options.getChannel("kanal");
      const guildId = interaction.guild.id;

      db.set(`girisCikisKanal_${guildId}`, kanal.id);

      const embed = new EmbedBuilder()
        .setTitle("Giriş-Çıkış Kanalı Ayarlandı! 🎉")
        .setDescription(
          `✅ **${kanal}** kanalına artık kullanıcı giriş ve çıkış mesajları gönderilecek.\nKapatmak için: \`/giriş-çıkış-kapat\``
        )
        .setColor("Green")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    name: "giriş-çıkış-kapat",
    description: "Giriş-çıkış mesaj sistemini kapatır!",
    type: 1,
    options: [],
    run: async (client, interaction) => {
      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content:
            "❌ | Bu komutu kullanmak için **Yönetici** yetkisine sahip olmalısınız!",
          ephemeral: true,
        });
      }

      const guildId = interaction.guild.id;
      const mevcutKanal = db.get(`girisCikisKanal_${guildId}`);

      if (!mevcutKanal) {
        return interaction.reply({
          content: "❌ | Bu sunucuda giriş-çıkış sistemi zaten ayarlı değil!",
          ephemeral: true,
        });
      }

      db.delete(`girisCikisKanal_${guildId}`);

      const embed = new EmbedBuilder()
        .setTitle("Giriş-Çıkış Sistemi Kapatıldı! 🔇")
        .setDescription("✅ Giriş-çıkış mesajları artık gönderilmeyecek.")
        .setColor("Red")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  },
];

client.on("guildMemberAdd", async (member) => {
  const guildId = member.guild.id;
  const kanalId = db.get(`girisCikisKanal_${guildId}`);

  if (!kanalId) return;

  const kanal = await member.guild.channels.fetch(kanalId).catch(() => null);
  if (!kanal) {
    db.delete(`girisCikisKanal_${guildId}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("<:Moderator:1381648147910099024> A new member has joined!")
    .setDescription(
      `
      **Hoş Geldin ${member.user.tag}!** 🎊
      Welcome to Nuron's Krak  

      **User Info:**
      <:emoji_19:1381663001098326167> **ID:** ${member.user.id}
      <:emoji_19:1381663020559896739> **Account Creation Date;** <t:${Math.floor(member.user.createdAt / 1000)}:R>

      **Server Info :**
      <:emoji_20:1381700870831472801> **Member Count;** ${member.guild.memberCount}
      <:emoji_16:1381662917904039986> **Server:** ${member.guild.name}
    `
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage(
      "https://cdn.discordapp.com/attachments/1254160373133869179/1263563031774892073/ArhiBots_QjM3heKn0B.gif"
    )
    .setColor("#00FF00")
    .setFooter({
      text: `Welcome to Our Server!`,
      iconURL: member.guild.iconURL(),
    })
    .setTimestamp();

  await kanal.send({ embeds: [embed] }).catch(() => {});
});

client.on("guildMemberRemove", async (member) => {
  const guildId = member.guild.id;
  const kanalId = db.get(`girisCikisKanal_${guildId}`);

  if (!kanalId) return;

  const kanal = await member.guild.channels.fetch(kanalId).catch(() => null);
  if (!kanal) {
    db.delete(`girisCikisKanal_${guildId}`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle("<:Moderator:1381648147910099024> A member left")
    .setDescription(
      `
      **${member.user.tag}** A member left.
      I hope you never come back to us again!

      **Kullanıcı Bilgileri:**
      <:emoji_19:1381663001098326167> **ID:** ${member.user.id}
      <:emoji_19:1381663020559896739> **Server Join Date:** <t:${Math.floor(member.joinedAt / 1000)}:R>

      **Sunucu Bilgileri:**
      <:emoji_20:1381700870831472801> **Member Count:** ${member.guild.memberCount}
      <:emoji_16:1381662917904039986> **Server:** ${member.guild.name}
    `
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setImage("https://cdn.discordapp.com/attachments/1335768922389090355/1335772329069776947/gxhq7qp.gif")
    .setColor("#FF0000")
    .setFooter({ text: `Byee Nab`, iconURL: member.guild.iconURL() })
    .setTimestamp();

  await kanal.send({ embeds: [embed] }).catch(() => {});
});
