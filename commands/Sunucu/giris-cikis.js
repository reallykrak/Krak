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
      "Sets the Entrance-Exit message!",
    type: 1,
    options: [
      {
        name: "channel",
        description: "Channel to Send Messages!",
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
            "<:no:1382108974584823978> | to use this command **Owner** to the authority own You must be!",
          ephemeral: true,
        });
      }

      const kanal = interaction.options.getChannel("channel");
      const guildId = interaction.guild.id;

      db.set(`girisCikisKanal_${guildId}`, kanal.id);

      const embed = new EmbedBuilder()
        .setTitle("Entrance-Exit Channel set! <:emoji_7:1381662606183370843>")
        .setDescription(
          `<:emoji_17:1381662952985333861> **${kanal}** Entrance-Exit messages will now be sent to your channel.\nTo close for  : \`/entrance-Exit-Close\``
        )
        .setColor("Green")
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    },
  },
  {
    name: "giriş-çıkış-kapat",
    description: "Entrance-Exit Closes the message system!",
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
            "<:no:1382108974584823978> | This command to use for  **Owner** To the authority own You must be!",
          ephemeral: true,
        });
      }

      const guildId = interaction.guild.id;
      const mevcutKanal = db.get(`girisCikisKanal_${guildId}`);

      if (!mevcutKanal) {
        return interaction.reply({
          content: "<:no:1382108974584823978> | This Server Entrance-Exit System already set not!",
          ephemeral: true,
        });
      }

      db.delete(`girisCikisKanal_${guildId}`);

      const embed = new EmbedBuilder()
        .setTitle("Entrance-Exit System Closed! <:emoji_17:1381662952985333861>")
        .setDescription("<:emoji_17:1381662952985333861> Entrance-Exit messages Now will not be sent")
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
      **Welcome To Nuron's Krak ${member.user.tag}!** <:emoji_7:1381662606183370843>
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
