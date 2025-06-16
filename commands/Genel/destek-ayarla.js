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
  description: "Destek sistemini kurar ve yönetir.",
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
    {
      name: "destek_yetkilisi",
      description: "Destek taleplerini yönetecek yetkili rolü.",
      type: ApplicationCommandOptionType.Role,
      required: true,
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
          "❌ | Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const kanal = interaction.options.getChannel("kanal");
    const embedMesaj = interaction.options.getString("embedmesaj");
    const logKanal = interaction.options.getChannel("logkanal");
    const yetkiliRol = interaction.options.getRole("destek_yetkilisi");

    if (!kanal || !logKanal || !yetkiliRol) {
      return interaction.reply({
        content:
          "❌ | Belirtilen kanallar veya roller bulunamadı. Lütfen geçerli seçimler yapın.",
        ephemeral: true,
      });
    }

    db.set(`destek_sistemi_${interaction.guild.id}`, {
      kanal: kanal.id,
      embedMesaj: embedMesaj,
      logKanal: logKanal.id,
      yetkiliRolId: yetkiliRol.id,
    });

    // Sunucu için ticket sayacını sıfırla veya başlat
    if (!db.has(`destek_sayac_${interaction.guild.id}`)) {
        db.set(`destek_sayac_${interaction.guild.id}`, 0);
    }


    const destekEmbed = new EmbedBuilder()
      .setTitle(`${config["bot-adi"]} - Destek Sistemi`)
      .setDescription(embedMesaj)
      .setColor("#00ff00")
      .addFields([
        {
          name: "ℹ️ Nasıl Çalışır?",
          value:
            "Aşağıdaki butona tıklayarak destek talebi açabilirsiniz. Size özel bir kanal oluşturulacak ve yetkili ekibimizle iletişim kurabileceksiniz.",
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
        content: `✅ | Destek sistemi başarıyla ${kanal} kanalına kuruldu! Loglar ${logKanal}'a gönderilecek ve ${yetkiliRol} rolü talepleri yönetebilecek.`,
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
    const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
    if (!sistemVeri || !sistemVeri.logKanal || !sistemVeri.yetkiliRolId) {
      return interaction.reply({
        content:
          "❌ | Destek sistemi düzgün yapılandırılmamış. Lütfen bir yönetici ile görüşün.",
        ephemeral: true,
      });
    }

    const logKanal = interaction.guild.channels.cache.get(sistemVeri.logKanal);
    const yetkiliRol = interaction.guild.roles.cache.get(sistemVeri.yetkiliRolId);

    if (!logKanal || !yetkiliRol) {
      return interaction.reply({
        content: "❌ | Log kanalı veya yetkili rolü bulunamadı. Lütfen sistemi yeniden kurun.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const konu = interaction.fields.getTextInputValue("destek_konu");
    const aciklama = interaction.fields.getTextInputValue("destek_aciklama");

    try {
        // Ticket kategorisini bul veya oluştur
        let ticketKategori = interaction.guild.channels.cache.find(c => c.name === "😽 • Tickets" && c.type === ChannelType.GuildCategory);
        if (!ticketKategori) {
            ticketKategori = await interaction.guild.channels.create({
                name: "😽 • Tickets",
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: client.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels],
                    },
                    {
                        id: yetkiliRol.id,
                        allow: [PermissionsBitField.Flags.ViewChannel],
                    },
                ],
            });
        }
      
      // Ticket sayacını artır
      const ticketSayi = db.add(`destek_sayac_${interaction.guild.id}`, 1);


      const destekKanal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}-${ticketSayi}`,
        type: ChannelType.GuildText,
        parent: ticketKategori.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id, // @everyone
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
            ],
          },
          {
             id: yetkiliRol.id,
             allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.ManageMessages,
             ]
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.ManageChannels,
            ],
          },
        ],
      });
      
      // Veritabanı kayıtları
      db.set(`destek_kanal_id_${destekKanal.id}`, interaction.user.id);
      db.set(`destek_kanal_${interaction.guild.id}_${interaction.user.id}`, {
        kanalId: destekKanal.id,
        konu: konu,
        aciklama: aciklama,
        acilisZamani: Date.now(),
      });

      const kanalEmbed = new EmbedBuilder()
        .setTitle("📬 | Yeni Destek Talebi")
        .setDescription(
          `Merhaba ${interaction.user}, destek talebiniz oluşturuldu! ${yetkiliRol} rolündeki ekibimiz en kısa sürede size yardımcı olacak.`
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

      const row = new ActionRowBuilder().addComponents(
        new SelectMenuBuilder()
          .setCustomId("destek_yonetim")
          .setPlaceholder("Talebi Yönet")
          .addOptions([
            {
              label: "Talebi Kapat",
              description: "Destek talebini kapatır ve kanalı siler.",
              value: "kapat",
              emoji: "✖️",
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
                label: "Ticket'ı Kilitle",
                description: "Yetkililer dışında kimsenin mesaj yazmasını engeller.",
                value: "kilitle",
                emoji: "🔐",
            },
            {
                label: "Ticket Kilidini Aç",
                description: "Kullanıcının kanala yeniden mesaj yazmasını sağlar.",
                value: "kilit_ac",
                emoji: "🔓",
            },
            {
                label: "Kullanıcıya DM Gönder",
                description: "Talep sahibine özel mesaj gönderir.",
                value: "dm_gonder",
                emoji: "📨",
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
        content: `${interaction.user} ${yetkiliRol}`,
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

      await interaction.editReply({
        content: `✅ | Destek talebiniz başarıyla oluşturuldu! Lütfen <#${destekKanal.id}> kanalına göz atın.`,
      });
    } catch (error) {
      console.error("Destek kanalı oluşturulurken hata:", error);
      await interaction.editReply({
        content:
          "❌ | Destek talebi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
      });
    }
  }

  // Destek yönetim menüsü
  if (interaction.isSelectMenu() && interaction.customId === "destek_yonetim") {
    const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !interaction.member.roles.cache.has(sistemVeri?.yetkiliRolId)) {
        return interaction.reply({ content: "❌ | Bu menüyü kullanmak için `Kanalları Yönet` yetkisine veya destek yetkilisi rolüne sahip olmalısınız!", ephemeral: true });
    }

    const talepSahibiId = db.get(`destek_kanal_id_${interaction.channel.id}`);
    if (!talepSahibiId) {
        return interaction.reply({
            content: "❌ | Bu kanalın sahibi veritabanında bulunamadı. Kanalın verisi silinmiş olabilir.",
            ephemeral: true,
        });
    }

    const logKanal = sistemVeri?.logKanal
      ? interaction.guild.channels.cache.get(sistemVeri.logKanal)
      : null;

    const selectedValue = interaction.values[0];

    if (selectedValue === "kapat") {
        await interaction.reply({ content: `Talebi kapatma işlemi başlatıldı, kanal 5 saniye içinde silinecek.`, ephemeral: true });

        const kanalAdi = interaction.channel.name;
        
        setTimeout(async () => {
            try {
                await interaction.channel.delete();
                db.delete(`destek_kanal_id_${interaction.channel.id}`);
                db.delete(`destek_kanal_${interaction.guild.id}_${talepSahibiId}`);
        
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
        
              } catch (error) {
                console.error("Kanal silinirken hata:", error);
              }
        }, 5000);
    }
    else if (selectedValue === "bilgi") {
        const talep = db.get(`destek_kanal_${interaction.guild.id}_${talepSahibiId}`);
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
    else if (selectedValue === "kilitle") {
        const talepSahibi = await interaction.guild.members.fetch(talepSahibiId).catch(() => null);
        if (!talepSahibi) {
            return interaction.reply({ content: "❌ | Talep sahibi sunucuda bulunamadı.", ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(talepSahibi.id, {
            SendMessages: false,
        });

        await interaction.reply({ content: `✅ | Ticket kilitlendi. Artık sadece yetkililer mesaj gönderebilir.`, ephemeral: true });
        
        const lockEmbed = new EmbedBuilder()
            .setColor("#ffA500")
            .setDescription(`🔐 | Bu talep <@${interaction.user.id}> tarafından kilitlendi. Artık sadece yetkililer mesaj gönderebilir.`);
        await interaction.channel.send({ embeds: [lockEmbed] });

        if (logKanal) {
            const logEmbed = new EmbedBuilder()
                .setTitle("🔐 | Ticket Kilitlendi")
                .setColor("#ffA500")
                .addFields(
                    { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
                    { name: "👤 Talep Sahibi", value: `${talepSahibi.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal.send({ embeds: [logEmbed] });
        }
    }
    else if (selectedValue === "kilit_ac") {
        const talepSahibi = await interaction.guild.members.fetch(talepSahibiId).catch(() => null);
        if (!talepSahibi) {
            return interaction.reply({ content: "❌ | Talep sahibi sunucuda bulunamadı.", ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(talepSahibi.id, {
            SendMessages: true,
        });

        await interaction.reply({ content: `✅ | Ticket kilidi ${talepSahibi} için açıldı.`, ephemeral: true });
        
        const unlockEmbed = new EmbedBuilder()
            .setColor("#2bff00")
            .setDescription(`🔓 | Bu talebin kilidi <@${interaction.user.id}> tarafından açıldı. Artık mesaj gönderebilirsiniz.`);
        await interaction.channel.send({ embeds: [unlockEmbed] });

        if (logKanal) {
            const logEmbed = new EmbedBuilder()
                .setTitle("🔓 | Ticket Kilidi Açıldı")
                .setColor("#2bff00")
                .addFields(
                    { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
                    { name: "👤 Talep Sahibi", value: `${talepSahibi.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal.send({ embeds: [logEmbed] });
        }
    }
    else if (selectedValue === "uye_ekle" || selectedValue === "uye_cikar" || selectedValue === "dm_gonder") {
        // Modalları tetikleyen diğer seçenekler için modal oluşturma
        let modal;
        if (selectedValue === "uye_ekle") {
            modal = new ModalBuilder()
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
        } else if (selectedValue === "uye_cikar") {
            modal = new ModalBuilder()
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
        } else if (selectedValue === "dm_gonder") {
            modal = new ModalBuilder()
                .setCustomId("destek_dm_gonder_modal")
                .setTitle("Kullanıcıya DM Gönder")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("dm_mesaj")
                            .setLabel("Gönderilecek Mesaj")
                            .setPlaceholder("Kullanıcıya göndermek istediğiniz mesajı buraya yazın.")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
        }
        await interaction.showModal(modal);
    }
  }

  // --- MODAL SUBMIT HANDLERS ---
  const handleModalSubmit = async (customId, action) => {
    if (interaction.type !== InteractionType.ModalSubmit || interaction.customId !== customId) return;
    
    const sistemVeri = db.get(`destek_sistemi_${interaction.guild.id}`);
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !interaction.member.roles.cache.has(sistemVeri?.yetkiliRolId)) {
        return; // Yetki yoksa işlem yapma
    }
    await action();
  };
  
  // Üye Ekleme
  handleModalSubmit("destek_uye_ekle_modal", async () => {
    const uyeId = interaction.fields.getTextInputValue("uye_id");
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
      return interaction.reply({ content: "❌ | Geçersiz bir üye ID'si girdiniz veya üye sunucuda değil.", ephemeral: true });
    }

    try {
      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      });

      await interaction.reply({ content: `✅ | ${member} başarıyla ticketa eklendi!`, ephemeral: true });
      
      const logKanal = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
      if (logKanal) {
        // ... Loglama kodu ...
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ | Üye eklenirken bir hata oluştu. İzinlerimi kontrol edin.", ephemeral: true });
    }
  });

  // Üye Çıkarma
  handleModalSubmit("destek_uye_cikar_modal", async () => {
    const uyeId = interaction.fields.getTextInputValue("uye_id");
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
      return interaction.reply({ content: "❌ | Geçersiz bir üye ID'si girdiniz veya üye sunucuda değil.", ephemeral: true });
    }
    
    // Ticket sahibini çıkartmayı engelle
    const talepSahibiId = db.get(`destek_kanal_id_${interaction.channel.id}`);
    if (member.id === talepSahibiId) {
        return interaction.reply({ content: "❌ | Ticket sahibini tickettan atamazsınız!", ephemeral: true });
    }

    try {
      await interaction.channel.permissionOverwrites.delete(member.id);
      await interaction.reply({ content: `✅ | ${member} başarıyla tickettan çıkarıldı!`, ephemeral: true });

      const logKanal = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
      if (logKanal) {
        // ... Loglama kodu ...
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ | Üye çıkarılırken bir hata oluştu.", ephemeral: true });
    }
  });

  // DM Gönderme
  handleModalSubmit("destek_dm_gonder_modal", async () => {
    const talepSahibiId = db.get(`destek_kanal_id_${interaction.channel.id}`);
    if (!talepSahibiId) {
        return interaction.reply({ content: "❌ | Bu kanalın sahibi olan kullanıcı bulunamadı.", ephemeral: true });
    }
    
    const mesajIcerik = interaction.fields.getTextInputValue("dm_mesaj");
    const talepSahibi = await client.users.fetch(talepSahibiId).catch(() => null);

    if (!talepSahibi) {
        return interaction.reply({ content: "❌ | Talep sahibi kullanıcı bulunamadı.", ephemeral: true });
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle(`📬 | Yetkiliden Yeni Mesaj`)
            .setDescription(mesajIcerik)
            .setColor("#0099ff")
            .setAuthor({ name: `${interaction.user.tag} (${interaction.guild.name})`, iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: config.footer || `Bu mesaja yanıt veremezsiniz.`})
            .setTimestamp();

        await talepSahibi.send({ embeds: [dmEmbed] });
        await interaction.reply({ content: `✅ | Mesajınız başarıyla ${talepSahibi.tag} kullanıcısına gönderildi.`, ephemeral: true });

        const logKanalId = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
        if (logKanalId) {
            // ... Loglama kodu ...
        }
    } catch (error) {
        console.error("Kullanıcıya DM gönderilemedi (Modal):", error);
        await interaction.reply({ content: `❌ | Kullanıcıya DM gönderilemedi. Muhtemelen özel mesajları kapalı.`, ephemeral: true });
    }
  });
});
