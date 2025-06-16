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
  UserSelectMenuBuilder, // YENİ: Kullanıcı seçim menüsü için eklendi
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
      const destekKanal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.channel.parentId,
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
              PermissionsBitField.Flags.ManageChannels,
            ],
          },
        ],
      });

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
                description: "Kullanıcının kanala mesaj yazmasını engeller.",
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
    const talepSahibiMember = interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === interaction.channel.name.split("-")[1]?.toLowerCase());

    if (!talepSahibiMember) {
        return interaction.reply({
            content: "❌ | Bu kanalın sahibi olan kullanıcı bulunamadı. Kanal adı değiştirilmiş olabilir.",
            ephemeral: true,
        });
    }
    const talepSahibiId = talepSahibiMember.id;

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
    }
    // GÜNCELLENDİ: "uye_ekle" seçeneği artık kullanıcı seçim menüsü gösteriyor
    else if (selectedValue === "uye_ekle") {
        const userSelectMenu = new UserSelectMenuBuilder()
            .setCustomId('destek_uye_ekle_menu')
            .setPlaceholder('Ticketa eklenecek üyeyi seçin.')
            .setMinValues(1)
            .setMaxValues(1);
            
        const row = new ActionRowBuilder().addComponents(userSelectMenu);

        await interaction.reply({
            content: "Lütfen ticketa eklemek istediğiniz kullanıcıyı seçin:",
            components: [row],
            ephemeral: true
        });
    } 
    // GÜNCELLENDİ: "uye_cikar" seçeneği artık kullanıcı seçim menüsü gösteriyor
    else if (selectedValue === "uye_cikar") {
        // Kanalda olan, bot olmayan ve talep sahibi olmayan kullanıcıları filtrele
        const channelMembers = interaction.channel.members
            .filter(member => !member.user.bot && member.id !== talepSahibiId)
            .map(member => ({ label: member.user.username, value: member.id }));

        if (channelMembers.length === 0) {
            return interaction.reply({
                content: "❌ | Bu tickettan çıkarılabilecek başka üye bulunmuyor.",
                ephemeral: true,
            });
        }
        
        // NOT: Discord.js v14'te UserSelectMenu belirli kullanıcıları filtrelemeyi doğrudan desteklemez.
        // Bu nedenle tüm sunucu üyelerini gösteririz. Yetkili doğru kişiyi seçmelidir.
        // Alternatif olarak, aşağıda normal bir SelectMenuBuilder ile sadece kanaldaki üyeler listelenebilir. Biz daha modern olan UserSelectMenu'yü kullanacağız.

        const userSelectMenu = new UserSelectMenuBuilder()
            .setCustomId('destek_uye_cikar_menu')
            .setPlaceholder('Tickettan çıkarılacak üyeyi seçin.')
            .setMinValues(1)
            .setMaxValues(1);

        const row = new ActionRowBuilder().addComponents(userSelectMenu);

        await interaction.reply({
            content: "Lütfen tickettan çıkarmak istediğiniz kullanıcıyı seçin:",
            components: [row],
            ephemeral: true
        });
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
    // YENİ: Ticket Kilitleme
    else if (selectedValue === "kilitle") {
        await interaction.channel.permissionOverwrites.edit(talepSahibiId, {
            SendMessages: false,
        });

        await interaction.reply({ content: `✅ | Ticket ${talepSahibiMember} için kilitlendi.`, ephemeral: true });
        
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
                    { name: "👤 Talep Sahibi", value: `${talepSahibiMember.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal.send({ embeds: [logEmbed] });
        }
    }
    // YENİ: Ticket Kilit Açma
    else if (selectedValue === "kilit_ac") {
        await interaction.channel.permissionOverwrites.edit(talepSahibiId, {
            SendMessages: true,
        });

        await interaction.reply({ content: `✅ | Ticket kilidi ${talepSahibiMember} için açıldı.`, ephemeral: true });
        
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
                    { name: "👤 Talep Sahibi", value: `${talepSahibiMember.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal.send({ embeds: [logEmbed] });
        }
    }
    // YENİ: Kullanıcıya DM Gönderme
    else if (selectedValue === "dm_gonder") {
        const modal = new ModalBuilder()
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
        await interaction.showModal(modal);
    }
  }

  // YENİ: Üye Ekleme Menüsü İşleyicisi
  if (interaction.isUserSelectMenu() && interaction.customId === 'destek_uye_ekle_menu') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

    const uyeId = interaction.values[0];
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
        return interaction.update({ content: "❌ | Geçersiz bir üye seçildi veya üye sunucudan ayrılmış.", components: [] });
    }

    try {
        await interaction.channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
        });

        await interaction.update({ content: `✅ | ${member} başarıyla ticketa eklendi!`, components: [] });
      
        const logKanalId = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
        if (logKanalId) {
            const logKanal = interaction.guild.channels.cache.get(logKanalId);
            const logEmbed = new EmbedBuilder()
                .setTitle("➕ | Ticketa Üye Eklendi")
                .setColor("#2bff00")
                .addFields(
                    { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
                    { name: "👤 Eklenen Üye", value: `${member.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal?.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error(error);
        await interaction.update({ content: "❌ | Üye eklenirken bir hata oluştu. İzinlerimi kontrol edin.", components: [] });
    }
  }

  // YENİ: Üye Çıkarma Menüsü İşleyicisi
  if (interaction.isUserSelectMenu() && interaction.customId === 'destek_uye_cikar_menu') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;

    const uyeId = interaction.values[0];
    const member = await interaction.guild.members.fetch(uyeId).catch(() => null);

    if (!member) {
        return interaction.update({ content: "❌ | Geçersiz bir üye seçildi veya üye sunucudan ayrılmış.", components: [] });
    }

    // Talep sahibinin çıkarılmasını engelle
    const talepSahibiMember = interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === interaction.channel.name.split("-")[1]?.toLowerCase());
    if (member.id === talepSahibiMember?.id) {
        return interaction.update({ content: "❌ | Talep sahibini tickettan atamazsınız!", components: [] });
    }

    try {
        await interaction.channel.permissionOverwrites.delete(member.id);

        await interaction.update({ content: `✅ | ${member} başarıyla tickettan çıkarıldı!`, components: [] });

        const logKanalId = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
        if (logKanalId) {
            const logKanal = interaction.guild.channels.cache.get(logKanalId);
            const logEmbed = new EmbedBuilder()
                .setTitle("➖ | Tickettan Üye Çıkarıldı")
                .setColor("#ff8800")
                .addFields(
                    { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
                    { name: "👤 Çıkarılan Üye", value: `${member.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: true }
                )
                .setTimestamp();
            logKanal?.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error(error);
        await interaction.update({ content: "❌ | Üye çıkarılırken bir hata oluştu.", components: [] });
    }
  }

  // Kullanıcıya DM Gönderme Modalı
  if (
    interaction.type === InteractionType.ModalSubmit &&
    interaction.customId === "destek_dm_gonder_modal"
  ) {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageChannels
      )
    )
      return;

    const talepSahibiMember = interaction.guild.members.cache.find(m => m.user.username.toLowerCase() === interaction.channel.name.split("-")[1]?.toLowerCase());

    if (!talepSahibiMember) {
        return interaction.reply({
            content: "❌ | Bu kanalın sahibi olan kullanıcı bulunamadı. Kanal adı değiştirilmiş olabilir.",
            ephemeral: true,
        });
    }
    
    const mesajIcerik = interaction.fields.getTextInputValue("dm_mesaj");
    
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle(`📬 | Yetkiliden Yeni Mesaj`)
            .setDescription(mesajIcerik)
            .setColor("#0099ff")
            .setAuthor({ name: `${interaction.user.tag} (${interaction.guild.name})`, iconURL: interaction.user.displayAvatarURL() })
            .setFooter({ text: config.footer || `Bu mesaja yanıt veremezsiniz.`})
            .setTimestamp();

        await talepSahibiMember.send({ embeds: [dmEmbed] });

        await interaction.reply({
            content: `✅ | Mesajınız başarıyla ${talepSahibiMember.user.tag} kullanıcısına gönderildi.`,
            ephemeral: true,
        });

        const logKanalId = db.get(`destek_sistemi_${interaction.guild.id}`)?.logKanal;
        if (logKanalId) {
            const logKanal = interaction.guild.channels.cache.get(logKanalId);
            const logEmbed = new EmbedBuilder()
                .setTitle("📨 | Kullanıcıya DM Gönderildi")
                .setColor("#0099ff")
                .addFields(
                    { name: "👤 Yetkili", value: `${interaction.user.tag}`, inline: true },
                    { name: "👤 Alıcı", value: `${talepSahibiMember.user.tag}`, inline: true },
                    { name: "📍 Kanal", value: `${interaction.channel}`, inline: false },
                    { name: "📝 Mesaj", value: mesajIcerik, inline: false }
                )
                .setTimestamp();
            logKanal?.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error("Kullanıcıya DM gönderilemedi (Modal):", error);
        await interaction.reply({
            content: `❌ | Kullanıcıya DM gönderilemedi. Muhtemelen özel mesajları kapalı.`,
            ephemeral: true,
        });
    }
  }
});
