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
  StringSelectMenuBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const db = require("croxydb");
const config = require("../../config.json"); // Make sure your config.json has bot-adi and footer

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
    {
        name: "yetkilirol",
        description: "Destek taleplerini görebilecek yetkili rolü.",
        type: ApplicationCommandOptionType.Role,
        required: true,
    }
  ],

  run: async (client, interaction) => {
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageGuild
      )
    ) {
      return interaction.reply({
        content:
          "❌ | Bu komutu kullanmak için `Sunucuyu Yönet` yetkisine sahip olmalısınız!",
        ephemeral: true,
      });
    }

    const kanal = interaction.options.getChannel("kanal");
    const embedMesaj = interaction.options.getString("embedmesaj");
    const logKanal = interaction.options.getChannel("logkanal");
    const yetkiliRol = interaction.options.getRole("yetkilirol");


    db.set(`destek_sistemi_${interaction.guild.id}`, {
      kanal: kanal.id,
      embedMesaj: embedMesaj,
      logKanal: logKanal.id,
      yetkiliRol: yetkiliRol.id
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
        content: `✅ | Destek sistemi başarıyla ${kanal} kanalına kuruldu! Loglar ${logKanal}'a gönderilecek ve ${yetkiliRol} rolü talepleri görebilecek.`,
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

// =======================================================================================================
// INTERACTION CREATE EVENT LISTENER'I (Bu kısmı ana bot dosyanıza veya event handler'ınıza koyun)
// =======================================================================================================
// ÖNEMLİ: Bu kod client objesine erişim gerektirir.
client.on("interactionCreate", async (interaction) => {
  const { guild, member, customId, channel, user } = interaction;
  if (!guild) return;

  const sistemVeri = db.get(`destek_sistemi_${guild.id}`);

  // Destek talebi açma butonu
  if (interaction.isButton() && customId === "destek_ac") {
    const mevcutKanalId = db.get(`destek_user_open_${guild.id}_${user.id}`);
    if (mevcutKanalId) {
        const mevcutKanal = guild.channels.cache.get(mevcutKanalId);
        if (mevcutKanal) {
            return interaction.reply({
                content: `❌ | Zaten açık bir destek talebiniz var: ${mevcutKanal}!`,
                ephemeral: true,
            });
        } else {
            // Eğer kanal bir şekilde silinmişse veritabanından temizle
            db.delete(`destek_user_open_${guild.id}_${user.id}`);
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
  if (interaction.type === InteractionType.ModalSubmit && customId === "destek_talep_modal") {
    if (!sistemVeri || !sistemVeri.logKanal || !sistemVeri.yetkiliRol) {
      return interaction.reply({
        content: "❌ | Destek sistemi düzgün yapılandırılmamış. Lütfen yetkililere bildirin.",
        ephemeral: true,
      });
    }

    const logKanal = guild.channels.cache.get(sistemVeri.logKanal);
    const yetkiliRol = guild.roles.cache.get(sistemVeri.yetkiliRol);

    if (!logKanal || !yetkiliRol) {
      return interaction.reply({
        content: "❌ | Log kanalı veya yetkili rolü bulunamadı. Lütfen yetkililere bildirin.",
        ephemeral: true,
      });
    }

    const konu = interaction.fields.getTextInputValue("destek_konu");
    const aciklama = interaction.fields.getTextInputValue("destek_aciklama");

    try {
      const destekKanal = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: channel.parentId, // Komutun kullanıldığı kanalın kategorisine açar
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
          {
            id: yetkiliRol.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
          {
            id: client.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory],
          },
        ],
      });

      // Veritabanı kaydı
      db.set(`destek_kanal_by_channel_${destekKanal.id}`, {
        talepSahibiId: user.id,
        konu: konu,
        aciklama: aciklama,
        acilisZamani: Date.now(),
        handlerId: null, // Talebi devralan yetkili
      });
      db.set(`destek_user_open_${guild.id}_${user.id}`, destekKanal.id);

      const kanalEmbed = new EmbedBuilder()
        .setTitle("📬 | Yeni Destek Talebi")
        .setDescription(`Merhaba ${user}, destek talebiniz oluşturuldu! Ekibimiz en kısa sürede size yardımcı olacak.`)
        .addFields([
          { name: "📝 Konu", value: `\`${konu}\``, inline: true },
          { name: "👤 Kullanıcı", value: `${user.tag} (${user.id})`, inline: true },
          { name: "📄 Açıklama", value: aciklama, inline: false },
        ])
        .setColor("#00ff00")
        .setFooter({ text: config.footer || "Destek talebinizi yönetmek için aşağıdaki menüyü kullanabilirsiniz." })
        .setTimestamp();
      
      const yonetimRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("destek_yonetim_menu")
          .setPlaceholder("Yetkili İşlemleri")
          .addOptions([
            { label: "Talebi Kapat", description: "Destek talebini kapatır ve kanalı siler.", value: "kapat", emoji: "✖️" },
            { label: "Üye Ekle", description: "Ticketa bir üye ekler.", value: "uye_ekle", emoji: "➕" },
            { label: "Üye Çıkart", description: "Tickettan bir üye çıkartır.", value: "uye_cikar", emoji: "➖" },
            { label: "Talebi Kilitle", description: "Kullanıcının kanala mesaj yazmasını engeller.", value: "kilitle", emoji: "🔐" },
            { label: "Talebin Kilidini Aç", description: "Kullanıcının kanala yeniden mesaj yazmasını sağlar.", value: "kilit_ac", emoji: "🔓" },
            { label: "Talep Bilgisi", description: "Talep detaylarını gösterir.", value: "bilgi", emoji: "ℹ️" },
            { label: "Kullanıcıya DM Gönder", description: "Talep sahibine özel mesaj gönderir.", value: "dm_gonder", emoji: "📩" }
          ])
      );

      const sistemRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("sistem_yonet_buton").setLabel("Sistemi Yönet").setStyle(ButtonStyle.Secondary).setEmoji("⚙️")
      )

      await destekKanal.send({ content: `${user}, ${yetkiliRol}`, embeds: [kanalEmbed], components: [yonetimRow, sistemRow] });

      const logEmbed = new EmbedBuilder()
        .setTitle("📋 | Yeni Destek Talebi")
        .addFields([
          { name: "👤 Kullanıcı", value: `${user.tag} (${user.id})`, inline: true },
          { name: "📝 Konu", value: `\`${konu}\``, inline: true },
          { name: "📍 Kanal", value: `<#${destekKanal.id}>`, inline: true },
        ])
        .setColor("#00ff00")
        .setTimestamp();
      await logKanal.send({ embeds: [logEmbed] });

      await interaction.reply({ content: `✅ | Destek talebiniz başarıyla oluşturuldu! Lütfen <#${destekKanal.id}> kanalına göz atın.`, ephemeral: true });
    } catch (error) {
      console.error("Destek kanalı oluşturulurken hata:", error);
      await interaction.reply({ content: "❌ | Destek talebi oluşturulurken bir hata oluştu.", ephemeral: true });
    }
  }

  // =======================================================================================================
  // YETKİLİ İŞLEMLERİ
  // =======================================================================================================
  const yetkiKontrol = () => {
    const yetkiliRolId = sistemVeri?.yetkiliRol;
    if (!yetkiliRolId) return false;
    return member.roles.cache.has(yetkiliRolId) || member.permissions.has(PermissionsBitField.Flags.ManageChannels);
  };
  
  if (!yetkiKontrol()) {
    // Sadece yetkililerin kullanabileceği butonlara basarsa uyarı ver
    const yetkiliCustomIds = ["sistem_yonet_buton", "devral", "devret", "cikar_uye_", "ekle_uye_"]; // Add 'ekle_uye_'
    if (interaction.isButton() && (yetkiliCustomIds.some(id => customId.startsWith(id)) || customId === "devret_menu")) {
        return interaction.reply({ content: "❌ | Bu işlemi sadece yetkililer yapabilir.", ephemeral: true });
    }
    if (interaction.isAnySelectMenu() && (customId === "destek_yonetim_menu" || customId === "uye_ekle_menu")) { // Add 'uye_ekle_menu'
        return interaction.reply({ content: "❌ | Bu menüyü sadece yetkililer kullanabilir.", ephemeral: true });
    }
  }


  const ticketData = db.get(`destek_kanal_by_channel_${channel.id}`);
  if (!ticketData && (interaction.isButton() || interaction.isAnySelectMenu())) {
     // Ticket kanalı dışındaki etkileşimleri burada ele alabiliriz, şimdilik boş
  }
  
  // ANA YÖNETİM MENÜSÜ
  if (interaction.isStringSelectMenu() && customId === "destek_yonetim_menu") {
    const selectedValue = interaction.values[0];
    const { talepSahibiId, konu, aciklama, acilisZamani } = ticketData;
    const logKanal = sistemVeri?.logKanal ? guild.channels.cache.get(sistemVeri.logKanal) : null;

    switch (selectedValue) {
        case "kapat":
            await interaction.reply({ content: `Talebi kapatma işlemi başlatıldı, kanal 5 saniye içinde silinecek.`, ephemeral: true });
            const kanalAdi = channel.name;
            setTimeout(async () => {
                try {
                    await channel.delete();
                    db.delete(`destek_user_open_${guild.id}_${talepSahibiId}`);
                    db.delete(`destek_kanal_by_channel_${channel.id}`);
                    // Loglama vs.
                } catch(e) { console.error("Kanal silinemedi:", e)}
            }, 5000);
            break;
        case "uye_cikar":
            const membersInChannel = channel.members.filter(m => !m.user.bot && m.id !== talepSahibiId && m.id !== user.id && m.id !== client.user.id && !m.roles.cache.has(sistemVeri.yetkiliRol)); // Exclude ticket owner, bot and staff members
            if (membersInChannel.size === 0) {
                return interaction.reply({ content: "❌ | Bu tickettan çıkarılabilecek (talep sahibi, bot ve yetkililer dışında) başka üye bulunmuyor.", ephemeral: true });
            }
            const components = [];
            const memberArray = Array.from(membersInChannel.values());
            for (let i = 0; i < memberArray.length; i += 5) {
                const row = new ActionRowBuilder();
                const chunk = memberArray.slice(i, i + 5);
                chunk.forEach(mem => {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`cikar_uye_${mem.id}`)
                            .setLabel(mem.user.username)
                            .setStyle(ButtonStyle.Secondary)
                    );
                });
                components.push(row);
            }
            await interaction.reply({ content: "Tickettan çıkarmak istediğiniz üyeyi seçin:", components, ephemeral: true });
            break;
        case "uye_ekle":
            // Get all members in the guild, excluding bots and members already in the channel
            const allGuildMembers = await guild.members.fetch();
            const membersNotInChannel = allGuildMembers.filter(m => 
                !m.user.bot && 
                !channel.members.has(m.id)
            );

            if (membersNotInChannel.size === 0) {
                return interaction.reply({ content: "❌ | Kanala eklenebilecek başka üye bulunmuyor.", ephemeral: true });
            }

            const memberOptions = membersNotInChannel.map(m => ({
                label: m.user.tag,
                value: m.id,
            })).slice(0, 25); // Discord select menu has a limit of 25 options

            if (memberOptions.length === 0) {
                return interaction.reply({ content: "❌ | Kanala eklenebilecek başka üye bulunmuyor.", ephemeral: true });
            }

            const selectMenuRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("uye_ekle_menu")
                    .setPlaceholder("Eklenecek üyeyi seçin")
                    .addOptions(memberOptions)
            );
            await interaction.reply({ content: "Kanala eklemek istediğiniz üyeyi seçin:", components: [selectMenuRow], ephemeral: true });
            break;
        case "kilitle":
            await channel.permissionOverwrites.edit(talepSahibiId, { SendMessages: false });
            await interaction.reply({ content: `✅ | Ticket kilitlendi.`, ephemeral: true });
            await channel.send({ embeds: [new EmbedBuilder().setColor("Orange").setDescription(`🔐 | Bu talep <@${user.id}> tarafından kilitlendi.`)] });
            break;
        case "kilit_ac":
            await channel.permissionOverwrites.edit(talepSahibiId, { SendMessages: true });
            await interaction.reply({ content: `✅ | Ticket kilidi açıldı.`, ephemeral: true });
            await channel.send({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`🔓 | Bu talebin kilidi <@${user.id}> tarafından açıldı.`)] });
            break;
        case "bilgi":
            const infoEmbed = new EmbedBuilder()
                .setTitle("ℹ️ | Talep Bilgisi")
                .addFields([
                    { name: "📝 Konu", value: `\`${konu}\``, inline: true },
                    { name: "👤 Talep Sahibi", value: `<@${talepSahibiId}>`, inline: true },
                    { name: "📄 Açıklama", value: aciklama, inline: false },
                    { name: "🗓️ Açılış Zamanı", value: `<t:${Math.floor(acilisZamani / 1000)}:F>`, inline: false }
                ])
                .setColor("Blue")
                .setFooter({ text: config.footer || "Destek Sistemi" })
                .setTimestamp();
            await interaction.reply({ embeds: [infoEmbed], ephemeral: true });
            break;
        case "dm_gonder":
            const dmModal = new ModalBuilder()
                .setCustomId("dm_gonder_modal")
                .setTitle("Talep Sahibine DM Gönder")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("dm_icerik")
                            .setLabel("Gönderilecek Mesaj")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(dmModal);
            break;
    }
  }

  // Üye Ekleme Select Menu İşlemi
  if (interaction.isStringSelectMenu() && customId === "uye_ekle_menu") {
    const selectedMemberId = interaction.values[0];
    const memberToAdd = await guild.members.fetch(selectedMemberId).catch(() => null);

    if (!memberToAdd) {
        return interaction.update({ content: "❌ | Seçilen üye bulunamadı.", components: [] });
    }

    try {
        await channel.permissionOverwrites.edit(memberToAdd.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        });
        await channel.send({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`➕ | ${memberToAdd.user.tag}, <@${user.id}> tarafından ticketa eklendi.`)] });
        await interaction.update({ content: `✅ | ${memberToAdd.user.tag} başarıyla ticketa eklendi.`, components: [] });
    } catch (error) {
        console.error("Üye eklenirken hata:", error);
        await interaction.update({ content: "❌ | Üye eklenirken bir hata oluştu.", components: [] });
    }
  }

  // DM Gönderme Modal Submit İşlemi
  if (interaction.type === InteractionType.ModalSubmit && customId === "dm_gonder_modal") {
    const dmIcerik = interaction.fields.getTextInputValue("dm_icerik");
    const { talepSahibiId } = ticketData;
    const talepSahibi = await client.users.fetch(talepSahibiId).catch(() => null);

    if (!talepSahibi) {
        return interaction.reply({ content: "❌ | Talep sahibi bulunamadı veya DM gönderilemiyor.", ephemeral: true });
    }

    try {
        const dmEmbed = new EmbedBuilder()
            .setAuthor({ name: `${user.username} (${guild.name})`, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setTitle("📣 | Yetkiliden Yeni Mesaj")
            .setDescription(dmIcerik)
            .setColor("Blue")
            .setTimestamp();
        
        await talepSahibi.send({ embeds: [dmEmbed] });
        await interaction.reply({ content: `✅ | Mesaj başarıyla <@${talepSahibi.id}> kullanıcısına gönderildi.`, ephemeral: true });
    } catch (error) {
        console.error("DM gönderilirken hata:", error);
        await interaction.reply({ content: "❌ | Kullanıcıya DM gönderilirken bir hata oluştu. Kullanıcının DM'leri kapalı olabilir.", ephemeral: true });
    }
  }

  // SİSTEM YÖNET BUTONU (Devral/Devret)
  if (interaction.isButton() && customId === "sistem_yonet_buton") {
    const sistemButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("devral").setLabel("Talebi Devral").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("devret").setLabel("Talebi Devret").setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ content: "Lütfen yapmak istediğiniz işlemi seçin:", components: [sistemButtons], ephemeral: true });
  }

  // TALEBİ DEVRAL BUTONU
  if (interaction.isButton() && customId === "devral") {
    if (ticketData.handlerId === user.id) {
        return interaction.reply({ content: "❌ | Bu talebi zaten siz yönetiyorsunuz.", ephemeral: true });
    }
    db.set(`destek_kanal_by_channel_${channel.id}.handlerId`, user.id);
    await channel.send({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`✅ | Bu destek talebi <@${user.id}> tarafından devralındı.`)] });
    await interaction.update({ content: "✅ | Talep başarıyla devralındı.", components: [], ephemeral: true });
  }

  // TALEBİ DEVRET BUTONU
  if (interaction.isButton() && customId === "devret") {
    const yetkililer = guild.members.cache.filter(m => (m.roles.cache.has(sistemVeri.yetkiliRol) || m.permissions.has(PermissionsBitField.Flags.ManageChannels)) && !m.user.bot && m.id !== user.id);
    if (yetkililer.size === 0) {
        return interaction.reply({ content: "❌ | Devredilecek başka yetkili bulunamadı.", ephemeral: true });
    }
    const menu = new StringSelectMenuBuilder()
        .setCustomId("devret_menu")
        .setPlaceholder("Devretmek istediğiniz yetkiliyi seçin")
        .addOptions(yetkililer.map(yetkili => ({ label: yetkili.user.tag, value: yetkili.id })));
    await interaction.update({ content: "Talebi devretmek istediğiniz yetkiliyi seçin:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }

  // TALEBİ DEVRET MENÜSÜ
  if (interaction.isStringSelectMenu() && customId === "devret_menu") {
    const yeniYetkiliId = interaction.values[0];
    const eskiYetkiliId = ticketData.handlerId; // This is not used, but kept for context if you need it.
    db.set(`destek_kanal_by_channel_${channel.id}.handlerId`, yeniYetkiliId);
    await channel.send({ embeds: [new EmbedBuilder().setColor("Blue").setDescription(`🔄 | Bu destek talebi <@${user.id}> tarafından <@${yeniYetkiliId}> kullanıcısına devredildi.`)] });
    await interaction.update({ content: `✅ | Talep başarıyla <@${yeniYetkiliId}> kullanıcısına devredildi.`, components: [] });
  }

  // ÜYE ÇIKART BUTONLARI
  if (interaction.isButton() && customId.startsWith("cikar_uye_")) {
    const uyeId = customId.split("_")[2];
    const memberToRemove = await guild.members.fetch(uyeId).catch(() => null);
    if (!memberToRemove) {
        return interaction.update({ content: "❌ | Bu üye artık sunucuda bulunmuyor.", components: [] });
    }

    try {
        await channel.permissionOverwrites.delete(memberToRemove.id);
        await channel.send({ embeds: [new EmbedBuilder().setColor("Orange").setDescription(`➖ | ${memberToRemove.user.tag}, <@${user.id}> tarafından tickettan çıkarıldı.`)] });

        // Buton listesini güncelle
        const membersInChannel = channel.members.filter(m => !m.user.bot && m.id !== ticketData.talepSahibiId && m.id !== memberToRemove.id && !m.roles.cache.has(sistemVeri.yetkiliRol));
        if (membersInChannel.size === 0) {
            return interaction.update({ content: `✅ | ${memberToRemove.user.tag} başarıyla çıkarıldı. Çıkarılacak başka üye kalmadı.`, components: [] });
        }
        const components = [];
        const memberArray = Array.from(membersInChannel.values());
        for (let i = 0; i < memberArray.length; i += 5) {
            const row = new ActionRowBuilder();
            const chunk = memberArray.slice(i, i + 5);
            chunk.forEach(mem => {
                row.addComponents(new ButtonBuilder().setCustomId(`cikar_uye_${mem.id}`).setLabel(mem.user.username).setStyle(ButtonStyle.Secondary));
            });
            components.push(row);
        }
        await interaction.update({ content: `✅ | ${memberToRemove.user.tag} başarıyla çıkarıldı. Başka bir üyeyi çıkarmak için seçin:`, components });
    } catch (error) {
        console.error("Üye çıkarılamadı:", error);
        await interaction.update({ content: "❌ | Üye çıkarılırken bir hata oluştu.", components: [] });
    }
  }

});                                                       
