const {
  EmbedBuilder,
  InteractionType,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const db = require("croxydb");
const config = require("../../config.json");

// Ana komut tanımı
module.exports = {
  name: "destek-sistemi",
  description: "Destek sistemi kurar ve yönetir.",
  type: ApplicationCommandType.ChatInput,
  cooldown: 10,
  options: [
    {
      name: "kanal",
      description: "Destek talebi embed'inin gönderileceği kanal",
      type: ApplicationCommandOptionType.Channel,
      required: true,
      channel_types: [ChannelType.GuildText],
    },
    {
      name: "embedmesaj",
      description: "Destek talebi embed'inin açıklaması",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "logkanal",
      description: "Destek taleplerinin loglarının gönderileceği kanal",
      type: ApplicationCommandOptionType.Channel,
      required: true,
      channel_types: [ChannelType.GuildText],
    },
  ],

  run: async (client, interaction) => {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return interaction.reply({
        content:
          "❌ | Bu komutu kullanmak için `Kanalları Yönet` yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const kanal = interaction.options.getChannel("kanal");
    const embedMesaj = interaction.options.getString("embedmesaj");
    const logKanal = interaction.options.getChannel("logkanal");

    if (!kanal || !logKanal) {
      return interaction.reply({
        content:
          "❌ | Belirtilen kanallar bulunamadı. Lütfen geçerli bir kanal seçin.",
        ephemeral: true,
      });
    }

    db.set(`destek_sistemi_${interaction.guild.id}`, {
      kanal: kanal.id,
      embedMesaj: embedMesaj,
      logKanal: logKanal.id,
    });

    const destekEmbed = new EmbedBuilder()
      .setTitle(`${config["bot-adi"]} - Destek Sistemi`)
      .setDescription(embedMesaj)
      .setColor("#00ff00")
      .addFields([
        {
          name: "ℹ️ Nasıl Çalışır?",
          value:
            "Aşağıdaki butona tıklayarak destek talebi açabilirsiniz. Size özel bir kanal oluşturulacak ve ekibimizle iletişim kurabileceksiniz.",
          inline: false,
        },
      ])
      .setFooter({
        text:
          config.footer ||
          "Destek talebi oluşturmak için aşağıdaki butona tıklayın!",
      })
      .setTimestamp()
      .setImage("https://i.hizliresim.com/orosrif.gif");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("destek_ac")
        .setLabel("Destek Talebi Aç")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📬")
    );

    try {
      const mesaj = await kanal.send({
        embeds: [destekEmbed],
        components: [row],
      });

      db.set(`destek_sistemi_${interaction.guild.id}.mesajId`, mesaj.id);

      await interaction.reply({
        content: `✅ | Destek sistemi başarıyla ${kanal} kanalına kuruldu! Loglar ${logKanal}'a gönderilecek.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Destek sistemi kurulurken hata:", error);
      await interaction.reply({
        content:
          "❌ | Destek sistemi kurulurken bir hata oluştu. Lütfen kanal izinlerini kontrol edin.",
        ephemeral: true,
      });
    }
  },
};

// InteractionCreate event listener'ı (Bu kısmı ana bot dosyanıza veya event handler'ınıza koyun)
// ÖNEMLİ: Bu kod client objesine erişim gerektirir.
client.on("interactionCreate", async (interaction) => {
  // Destek talebi açma butonu
  if (interaction.isButton() && interaction.customId === "destek_ac") {
    const mevcutKanal = db.get(
      `destek_kanal_${interaction.guild.id}_${interaction.user.id}`
    );
    if (mevcutKanal) {
      const kanal = interaction.guild.channels.cache.get(mevcutKanal.kanalId);
      if (kanal) {
        return interaction.reply({
          content: `❌ | Zaten açık bir destek talebiniz var: ${kanal}!`,
          ephemeral: true,
        });
      } else {
        db.delete(
          `destek_kanal_${interaction.guild.id}_${interaction.user.id}`
        );
      }
    }

    const modal = new ModalBuilder()
      .setCustomId("destek_talep_modal")
      .setTitle("Destek Talebi Oluştur")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("destek_konu")
            .setLabel("Destek Talebinin Konusu")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("destek_aciklama")
            .setLabel("Talebin Detaylı Açıklaması")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }

  // Destek talebi modal'ını gönderme
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === "destek_talep_modal"
  ) {
    const konu = interaction.fields.getTextInputValue("destek_konu");
    const aciklama = interaction.fields.getTextInputValue("destek_aciklama");

    const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
    if (!sistemVeri || !sistemVeri.logKanal) {
      return interaction.reply({
        content:
          "❌ | Destek sistemi düzgün yapılandırılmamış. Lütfen yetkililere bildirin.",
        ephemeral: true,
      });
    }

    const logKanal = interaction.guild.channels.cache.get(sistemVeri.logKanal);
    if (!logKanal) {
      return interaction.reply({
        content: "❌ | Log kanalı bulunamadı. Lütfen yetkililere bildirin.",
        ephemeral: true,
      });
    }

    try {
      // YENİ: Kanal adı değiştirildi
      const destekKanal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId, // Embedin gönderildiği kanalın kategorisine açar
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels, // Kanalı yönetebilmesi için
            ],
          },
          // Yetkili rolünü de ekleyebilirsiniz (Örnek)
          // {
          //   id: "YETKILI_ROL_ID",
          //   allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          // },
        ],
      });

      // Kanalları Yönet yetkisine sahip herkesin görmesini sağla
      const yetkiliRoller = interaction.guild.roles.cache.filter((role) =>
        role.permissions.has(PermissionsBitField.Flags.ManageChannels)
      );
      yetkiliRoller.forEach(async (rol) => {
        await destekKanal.permissionOverwrites.edit(rol.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
        });
      });


      db.set(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`, {
        kanalId: destekKanal.id,
        konu: konu,
        aciklama: aciklama,
        acilisZamani: Date.now(),
      });

      const kanalEmbed = new EmbedBuilder()
        .setTitle("📬 | Yeni Destek Talebi")
        .setDescription(
          `Merhaba ${interaction.user}, destek talebiniz oluşturuldu! Ekibimiz en kısa sürede size yardımcı olacak.`
        )
        .addFields([
          { name: "📝 Konu", value: `\`${konu}\``, inline: true },
          {
            name: "👤 Kullanıcı",
            value: `${interaction.user.tag} (${interaction.user.id})`,
            inline: true,
          },
          { name: "📄 Açıklama", value: aciklama, inline: false },

        ])
        .setColor("#00ff00")
        .setFooter({
          text:
            config.footer ||
            "Destek talebinizi yönetmek için aşağıdaki menüyü kullanabilirsiniz.",
        })
        .setTimestamp();

      // YENİ: Menü güncellendi
      const row = new ActionRowBuilder().addComponents(
        new SelectMenuBuilder()
          .setCustomId("destek_yonetim")
          .setPlaceholder("Talebi Yönet")
          .addOptions([
            {
              label: "Talebi Kapat",
              description: "Destek talebini kapatır ve kanalı siler.",
              value: "kapat",
              emoji: "🔒",
            },
            {
              label: "Üye Ekle",
              description: "Ticketa bir üye ekler.",
              value: "uye_ekle",
              emoji: "➕",
            },
            {
              label: "Üye Çıkart",
              description: "Tickettan bir üye çıkartır.",
              value: "uye_cikar",
              emoji: "➖",
            },
            {
              label: "Talep Bilgisi",
              description: "Talep detaylarını gösterir.",
              value: "bilgi",
              emoji: "ℹ️",
            },
          ])
      );

      await destekKanal.send({
        content: `${interaction.user}`,
        embeds: [kanalEmbed],
        components: [row],
      });

      const logEmbed = new EmbedBuilder()
        .setTitle("📋 | Yeni Destek Talebi")
        .setDescription(`Yeni bir destek talebi açıldı.`)
        .addFields([
          {
            name: "👤 Kullanıcı",
            value: `${interaction.user.tag} (${interaction.user.id})`,
            inline: true,
          },
          { name: "📝 Konu", value: `\`${konu}\``, inline: true },
          { name: "📄 Açıklama", value: aciklama, inline: false },
          { name: "📍 Kanal", value: `<#${destekKanal.id}>`, inline: true },
        ])
        .setColor("#00ff00")
        .setTimestamp();
      await logKanal.send({ embeds: [logEmbed] });

      await interaction.reply({
        content: `✅ | Destek talebiniz başarıyla oluşturuldu! Lütfen <#${destekKanal.id}> kanalına göz atın.`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Destek kanalı oluşturulurken hata:", error);
      await interaction.reply({
        content:
          "❌ | Destek talebi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
        ephemeral: true,
      });
    }
  }

  // Destek yönetim menüsü
  if (interaction.isSelectMenu() && interaction.customId === "destek_yonetim") {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    ) {
      return interaction.reply({
        content:
          "❌ | Bu işlemi gerçekleştirmek için `Kanalları Yönet` yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const selectedValue = interaction.values[0];
    const talepSahibiId = interaction.channel.name.split("-")[1] 
        ? (await interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === interaction.channel.name.split("-")[1].toLowerCase()))?.id 
        : null;

    if (!talepSahibiId) {
        return interaction.reply({
            content: "❌ | Bu kanalın sahibi olan kullanıcı bulunamadı. Kanal adı değiştirilmiş olabilir.",
            ephemeral: true,
        });
    }

    const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
    const logKanal = sistemVeri?.logKanal
      ? interaction.guild.channels.cache.get(sistemVeri.logKanal)
      : null;

    if (selectedValue === "kapat") {
        await interaction.reply({ content: `Talebi kapatma işlemi başlatıldı, kanal 5 saniye içinde silinecek.`, ephemeral: true });

        const kanalAdi = interaction.channel.name;
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
        
                if (logKanal) {
                  const logEmbed = new EmbedBuilder()
                    .setTitle("🔒 | Destek Talebi Kapatıldı")
                    .setDescription(`Bir destek talebi kapatıldı.`)
                    .addFields([
                      {
                        name: "👤 Yetkili",
                        value: `${interaction.user.tag} (${interaction.user.id})`,
                        inline: true,
                      },
                      {
                        name: "👤 Talep Sahibi",
                        value: `<@${talepSahibiId}>`,
                        inline: true,
                      },
                      { name: "📍 Kanal Adı", value: kanalAdi, inline: true },
                    ])
                    .setColor("#ff0000")
                    .setTimestamp();
                  await logKanal.send({ embeds: [logEmbed] });
                }
        
                try {
                  const kullanici = await client.users.fetch(talepSahibiId);
                  await kullanici.send({
                    embeds: [
                      new EmbedBuilder()
                        .setTitle("🔒 | Destek Talebiniz Kapatıldı")
                        .setDescription(
                          `**${interaction.guild.name}** sunucusundaki destek talebiniz bir yetkili tarafından kapatıldı. Yeni bir talep oluşturabilirsiniz!`
                        )
                        .setColor("#ff0000")
                        .setFooter({ text: config.footer || interaction.guild.name })
                        .setTimestamp(),
                    ],
                  });
                } catch (error) {
                  console.error("Kullanıcıya DM gönderilemedi:", error);
                  if (logKanal) logKanal.send(`⚠️ | **${kanalAdi}** talebinin sahibine DM gönderilemedi (DM'leri kapalı olabilir).`);
                }
        
                db.delete(`destek_kanal_${interaction.guild.id}_${talepSahibiId}`);
              } catch (error) {
                console.error("Kanal silinirken hata:", error);
              }
        }, 5000);
    } // YENİ: Üye Ekleme
    else if (selectedValue === "uye_ekle") {
      const modal = new ModalBuilder()
        .setCustomId("destek_uye_ekle_modal")
        .setTitle("Ticketa Üye Ekle")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("uye_id")
              .setLabel("Eklenecek Üyenin ID'si")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(18)
              .setMaxLength(19)
          )
        );
      await interaction.showModal(modal);
    } // YENİ: Üye Çıkarma
    else if (selectedValue === "uye_cikar") {
      const modal = new ModalBuilder()
        .setCustomId("destek_uye_cikar_modal")
        .setTitle("Tickettan Üye Çıkar")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("uye_id")
              .setLabel("Çıkarılacak Üyenin ID'si")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(18)
              .setMaxLength(19)
          )
        );
      await interaction.showModal(modal);
    } else if (selectedValue === "bilgi") {
      const talep = db.get(
        `destek_kanal_${interaction.guild.id}_${talepSahibiId}`
      );
      if (!talep) {
        return interaction.reply({
          content: "❌ | Talep bilgileri veritabanında bulunamadı.",
          ephemeral: true,
        });
      }

      const bilgiEmbed = new EmbedBuilder()
        .setTitle("ℹ️ | Destek Talebi Bilgileri")
        .setDescription(`Destek talebi detayları aşağıda yer alıyor.`)
        .addFields([
          { name: "👤 Talep Sahibi", value: `<@${talepSahibiId}>`, inline: true },
          { name: "📝 Konu", value: `\`${talep.konu}\``, inline: true },
          {
            name: "⏰ Açılış Zamanı",
            value: `<t:${Math.floor(talep.acilisZamani / 1000)}:R>`,
            inline: true,
          },
          { name: "📄 Açıklama", value: talep.aciklama, inline: false },
        ])
        .setColor("#0099ff")
        .setTimestamp();

      await interaction.reply({ embeds: [bilgiEmbed], ephemeral: true });
    }
  }

  // YENİ: Üye ekleme modalı
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === "destek_uye_ekle_modal"
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    )
      return;
    const uyeId = interaction.fields.getTextInputValue("uye_id");
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: "❌ | Geçersiz bir üye ID'si girdiniz veya üye sunucuda değil.",
        ephemeral: true,
      });
    }

    try {
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await interaction.reply({
        content: `✅ | ${member} başarıyla ticketa eklendi!`,
        ephemeral: true,
      });
      
      const logKanal = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
      if (logKanal) {
        const logEmbed = new EmbedBuilder()
          .setTitle("➕ | Ticketa Üye Eklendi")
          .setColor("#2bff00")
          .addFields(
            { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
            { name: "👤 Eklenen Üye", value: `${member.user.tag}`, inline: true },
            { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
          )
          .setTimestamp();
        interaction.guild.channels.cache.get(logKanal)?.send({ embeds: [logEmbed] });
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ | Üye eklenirken bir hata oluştu. İzinlerimi kontrol edin.",
        ephemeral: true,
      });
    }
  }

  // YENİ: Üye çıkarma modalı
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === "destek_uye_cikar_modal"
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    )
      return;
    const uyeId = interaction.fields.getTextInputValue("uye_id");
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: "❌ | Geçersiz bir üye ID'si girdiniz veya üye sunucuda değil.",
        ephemeral: true,
      });
    }

    try {
      // Üyenin özel iznini siler
      await interaction.channel.permissionOverwrites.delete(member.id);

      await interaction.reply({
        content: `✅ | ${member} başarıyla tickettan çıkarıldı!`,
        ephemeral: true,
      });

      const logKanal = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
      if (logKanal) {
        const logEmbed = new EmbedBuilder()
          .setTitle("➖ | Tickettan Üye Çıkarıldı")
          .setColor("#ff8800")
          .addFields(
            { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
            { name: "👤 Çıkarılan Üye", value: `${member.user.tag}`, inline: true },
            { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
          )
          .setTimestamp();
        interaction.guild.channels.cache.get(logKanal)?.send({ embeds: [logEmbed] });
      }

    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "❌ | Üye çıkarılırken bir hata oluştu. İzinlerimi kontrol edin.",
        ephemeral: true,
      });
    }
  }
});
