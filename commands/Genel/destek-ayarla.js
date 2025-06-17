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
const config = require("../../config.json");
const fs = require("node:fs"); // Added for file system operations

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
        parent: channel.parentId,
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
        handlerId: null,
        voiceChannelId: null,
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
      
      // Tek bir "Sistem Ayarları" butonu ekle
      const sistemAyarlariRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("sistem_ayarlari_ac")
          .setLabel("Sistem Ayarları")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⚙️")
      );

      await destekKanal.send({ content: `${user}, ${yetkiliRol}`, embeds: [kanalEmbed], components: [sistemAyarlariRow] });

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
  
  if (!yetkiKontrol() && customId !== "sistem_ayarlari_ac") { // "sistem_ayarlari_ac" butonunu yetki kontrolünden muaf tut
    const yetkiliCustomIds = ["sesli_destek_toggle", "yavas_mod_ayarla", "devral", "devret", "cikar_uye_", "ekle_uye_", "kaydet_mesajlar"]; 
    if (interaction.isButton() && (yetkiliCustomIds.some(id => customId.startsWith(id)) || customId === "devret_menu")) {
        return interaction.reply({ content: "❌ | Bu işlemi sadece yetkililer yapabilir.", ephemeral: true });
    }
    if (interaction.isAnySelectMenu() && (customId === "destek_yonetim_menu" || customId === "uye_ekle_menu" || customId === "yavas_mod_menu" || customId === "devret_menu")) { 
        return interaction.reply({ content: "❌ | Bu menüyü sadece yetkililer kullanabilir.", ephemeral: true });
    }
  }

  const ticketData = db.get(`destek_kanal_by_channel_${channel.id}`);
  if (!ticketData && (interaction.isButton() || interaction.isAnySelectMenu())) {
     // Ticket kanalı dışındaki etkileşimleri burada ele alabiliriz, şimdilik boş
  }

  // SİSTEM AYARLARI BUTONU
  if (interaction.isButton() && customId === "sistem_ayarlari_ac") {
      if (!yetkiKontrol()) {
          return interaction.reply({ content: "❌ | Bu menüyü sadece yetkililer kullanabilir.", ephemeral: true });
      }

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

      const sistemRowButtons1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sesli_destek_toggle").setLabel("Sesli Destek Aç/Kapat").setStyle(ButtonStyle.Secondary).setEmoji("📞"),
        new ButtonBuilder().setCustomId("yavas_mod_ayarla").setLabel("Yavaş Mod").setStyle(ButtonStyle.Secondary).setEmoji("⏱️")
      );

      const sistemRowButtons2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("devral").setLabel("Talebi Devral").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("devret").setLabel("Talebi Devret").setStyle(ButtonStyle.Secondary)
      )

      await interaction.reply({ content: "Lütfen yapmak istediğiniz işlemi seçin:", components: [yonetimRow, sistemRowButtons1, sistemRowButtons2], ephemeral: true });
  }
  
  // ANA YÖNETİM MENÜSÜ
  if (interaction.isStringSelectMenu() && customId === "destek_yonetim_menu") {
    const selectedValue = interaction.values[0];
    const { talepSahibiId, konu, aciklama, acilisZamani } = ticketData;
    const logKanal = sistemVeri?.logKanal ? guild.channels.cache.get(sistemVeri.logKanal) : null;

    switch (selectedValue) {
        case "kapat":
            await interaction.reply({ content: `Talebi kapatma işlemi başlatıldı, kanal 5 saniye içinde silinecek.`, ephemeral: true });
            
            // Konuşmaları kaydetme ve loglama işlemi
            const messages = await channel.messages.fetch({ limit: 100 }); // Son 100 mesajı al
            const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp); // Mesajları eskiyen yeniye sırala
            let logContent = "";
            for (const msg of sortedMessages.values()) {
                const author = msg.author;
                const timestamp = new Date(msg.createdTimestamp).toLocaleString("tr-TR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                });
                logContent += `• ${author.username} (${author.id}) ${msg.content} (${timestamp})\n`;
            }

            const logFileName = `ticket-${channel.name}-${Date.now()}.txt`;
            fs.writeFileSync(logFileName, logContent);

            const kapatanYetkili = interaction.user;
            const talepSahibi = await client.users.fetch(talepSahibiId);

            // Log kanalına kapatma embed'i gönder
            if (logKanal) {
                const logEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle(`Ticket Kapatıldı`)
                    .setDescription(`**#${channel.name}** isimli ticket kapatıldı ve mesajlar loglandı.`)
                    .addFields([
                        { name: "Müşteri", value: `<@${talepSahibiId}>`, inline: true },
                        { name: "Kapatan", value: `<@${kapatanYetkili.id}>`, inline: true },
                        { name: "Tarih", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    ])
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                const logRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId("kaydet_mesajlar") // Bu butonun customId'si önemli
                        .setLabel("Mesajlar")
                        .setStyle(ButtonStyle.Link) // Link style butonu oluştur, URL'yi dinamik olarak ayarlayacağız
                        .setURL(`attachment://${logFileName}`) // Geçici olarak URL'yi ayarla, sonra dosya ile birlikte göndereceğiz
                );

                await logKanal.send({ 
                    embeds: [logEmbed], 
                    components: [logRow], 
                    files: [{ attachment: logFileName, name: logFileName }] 
                });
            }

            // Kullanıcıya DM olarak log gönder
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor("#FF0000")
                    .setTitle(`Destek Talebiniz Kapatıldı`)
                    .setDescription(`**${channel.name}** isimli destek talebiniz kapatıldı. Konuşma geçmişiniz ektedir.`)
                    .addFields([
                        { name: "Kapatan Yetkili", value: `<@${kapatanYetkili.id}>`, inline: true },
                        { name: "Tarih", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                    ])
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                await talepSahibi.send({ embeds: [dmEmbed], files: [{ attachment: logFileName, name: logFileName }] });
            } catch (dmError) {
                console.error("Kullanıcıya DM gönderilemedi:", dmError);
            }
            
            // Dosyayı sil
            fs.unlinkSync(logFileName);

            setTimeout(async () => {
                try {
                    await channel.delete();
                    db.delete(`destek_user_open_${guild.id}_${talepSahibiId}`);
                    db.delete(`destek_kanal_by_channel_${channel.id}`);
                    if (ticketData.voiceChannelId) {
                        const voiceChannel = guild.channels.cache.get(ticketData.voiceChannelId);
                        if (voiceChannel) await voiceChannel.delete().catch(e => console.error("Ses kanalı silinemedi:", e));
                    }
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
            })).slice(0, 25);

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
            if (ticketData.voiceChannelId) {
                infoEmbed.addFields({ name: "📞 Sesli Destek Kanalı", value: `<#${ticketData.voiceChannelId}>`, inline: false });
            }
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
        await interaction.reply({ content: "❌ | Kullanıcının DM'leri kapalı olabilir veya bir hata oluştu.", ephemeral: true });
    }
  }

  // SESLİ DESTEK AÇ/KAPAT BUTONU
  if (interaction.isButton() && customId === "sesli_destek_toggle") {
    const { talepSahibiId } = ticketData;
    const talepSahibi = await guild.members.fetch(talepSahibiId).catch(() => null);
    if (!talepSahibi) {
      return interaction.reply({ content: "❌ | Talep sahibi bulunamadı.", ephemeral: true });
    }

    if (ticketData.voiceChannelId) {
      const voiceChannel = guild.channels.cache.get(ticketData.voiceChannelId);
      if (voiceChannel) {
        try {
          await voiceChannel.delete();
          db.set(`destek_kanal_by_channel_${channel.id}.voiceChannelId`, null);
          await interaction.reply({ content: `✅ | Sesli destek kanalı kapatıldı.`, ephemeral: true });
          await channel.send({ embeds: [new EmbedBuilder().setColor("Red").setDescription(`📞 | Sesli destek kanalı <@${user.id}> tarafından kapatıldı.`)] });
        } catch (error) {
          console.error("Sesli kanal silinirken hata:", error);
          await interaction.reply({ content: "❌ | Sesli destek kanalı kapatılırken bir hata oluştu.", ephemeral: true });
        }
      } else {
          db.set(`destek_kanal_by_channel_${channel.id}.voiceChannelId`, null);
          await interaction.reply({ content: "❌ | Sesli destek kanalı bulunamadı, veritabanı temizlendi.", ephemeral: true });
      }
    } else {
      try {
        const voiceChannel = await guild.channels.create({
          name: `VoiceSupport-${talepSahibi.user.username}`,
          type: ChannelType.GuildVoice,
          parent: channel.parentId,
          permissionOverwrites: [
            {
              id: guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: talepSahibi.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
            },
            {
              id: sistemVeri.yetkiliRol,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
            },
            {
              id: client.user.id,
              allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.ManageChannels],
            },
          ],
        });
        db.set(`destek_kanal_by_channel_${channel.id}.voiceChannelId`, voiceChannel.id);
        await interaction.reply({ content: `✅ | Sesli destek kanalı <#${voiceChannel.id}> başarıyla açıldı.`, ephemeral: true });
        await channel.send({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`📞 | Sesli destek kanalı <#${voiceChannel.id}> <@${user.id}> tarafından açıldı.`)
        .addFields({ name: "ℹ️ Nasıl Çalışır?", value: "Bu kanala katılarak yetkililerle sesli görüşme yapabilirsiniz.", inline: false })] });
      } catch (error) {
        console.error("Sesli kanal oluşturulurken hata:", error);
        await interaction.reply({ content: "❌ | Sesli destek kanalı oluşturulurken bir hata oluştu.", ephemeral: true });
      }
    }
  }

  // YAVAŞ MOD AYARLA BUTONU
  if (interaction.isButton() && customId === "yavas_mod_ayarla") {
    const slowmodeOptions = [
      { label: "Yavaş modu Kapat", value: "0" },
      { label: "5 Saniye", value: "5" },
      { label: "10 Saniye", value: "10" },
      { label: "15 Saniye", value: "15" },
      { label: "30 Saniye", value: "30" },
      { label: "1 Dakika", value: "60" },
      { label: "2 Dakika", value: "120" },
      { label: "5 Dakika", value: "300" },
      { label: "10 Dakika", value: "600" },
      { label: "15 Dakika", value: "900" },
      { label: "30 Dakika", value: "1800" },
      { label: "1 Saat", value: "3600" },
      { label: "2 Saat", value: "7200" },
      { label: "6 Saat", value: "21600" },
    ];

    const slowmodeMenu = new StringSelectMenuBuilder()
      .setCustomId("yavas_mod_menu")
      .setPlaceholder("Yavaş mod süresini seçin")
      .addOptions(slowmodeOptions);

    const row = new ActionRowBuilder().addComponents(slowmodeMenu);
    await interaction.reply({ content: "Kanal için yavaş mod süresini seçin:", components: [row], ephemeral: true });
  }

  // YAVAŞ MOD MENÜ SEÇİMİ
  if (interaction.isStringSelectMenu() && customId === "yavas_mod_menu") {
    const selectedSlowmode = parseInt(interaction.values[0]);
    try {
      await channel.setRateLimitPerUser(selectedSlowmode);
      await interaction.update({ content: `✅ | Kanalın yavaş modu ${selectedSlowmode === 0 ? "kapatıldı" : `${selectedSlowmode} saniyeye ayarlandı`}.`, components: [] });
      await channel.send({ embeds: [new EmbedBuilder().setColor("Blue").setDescription(`⏱️ | Kanalın yavaş modu <@${user.id}> tarafından ${selectedSlowmode === 0 ? "kapatıldı" : `**${selectedSlowmode} saniyeye** ayarlandı`}.`)] });
    } catch (error) {
      console.error("Yavaş mod ayarlanırken hata:", error);
      await interaction.update({ content: "❌ | Yavaş mod ayarlanırken bir hata oluştu.", components: [] });
    }
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
