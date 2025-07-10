const {
  Client,
  EmbedBuilder,
  PermissionsBitField,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("croxydb");

// Bu fonksiyonu dosyanın başına veya uygun bir yere ekleyin
function initialize(client) {
  client.on("guildMemberAdd", async (member) => {
    const registrationSystem = db.get(`registrationSystem_${member.guild.id}`);
    if (!registrationSystem) return;

    const unregisteredRole = member.guild.roles.cache.get(
      registrationSystem.unregisteredRoleId
    );
    if (!unregisteredRole) {
      console.error("Kayitsiz rolü bulunamadi.");
      return;
    }

    try {
      await member.setNickname(`${registrationSystem.tag} Yeni Üye`); // Varsayılan takma ad
      await member.roles.add(unregisteredRole);
    } catch (error) {
      console.error("Üye ayarlarini güncellerken hata oluştu:", error);
    }

    const registrationChannel = member.guild.channels.cache.get(
      registrationSystem.registrationChannelId
    );
    if (!registrationChannel) {
      console.error("Kayit kanali bulunamadi.");
      return;
    }

    const welcomeEmbed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`${member.guild.name} Sunucusuna Hoş Geldin!`)
      .setDescription(
        `${member}, sunucumuza hoş geldin! Kayıt olmak için aşağıdaki butona tıkla veya bir yetkiliyle iletişime geç.`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    const registerButton = new ButtonBuilder()
      .setCustomId(`initiate_register_${member.id}`)
      .setLabel("Şimdi Kayıt Ol")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("📝");

    const row = new ActionRowBuilder().addComponents(registerButton);

    registrationChannel
      .send({
        content: `Hoş geldin, ${member}!`,
        embeds: [welcomeEmbed],
        components: [row],
      })
      .catch(console.error);
  });

  client.on("interactionCreate", async (interaction) => {
    // ÖNEMLİ DÜZELTME: Etkileşimin bir sunucuda olup olmadığını kontrol et
    if (!interaction.guild) return;

    if (interaction.isButton()) {
      const registrationSystem = db.get(`registrationSystem_${interaction.guild.id}`);
      if (!registrationSystem) return;

      if (interaction.customId.startsWith("initiate_register_")) {
        const userId = interaction.customId.split("_")[2];
        const targetMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);

        if (!targetMember || targetMember.id !== interaction.user.id) {
          return interaction.reply({
            content: "❌ | Yalnızca kendin için kayıt başlatabilirsin.",
            ephemeral: true,
          });
        }

        if (targetMember.roles.cache.has(registrationSystem.registeredRoleId)) {
          return interaction.reply({
            content: "✅ | Zaten kayıtlısın!",
            ephemeral: true,
          });
        }

        const nameModal = new ModalBuilder()
          .setCustomId(`self_register_modal_${targetMember.id}`)
          .setTitle("İsmini Gir");

        const nameInput = new TextInputBuilder()
          .setCustomId("user_name")
          .setLabel("İsim")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("İstediğiniz ismi girin")
          .setRequired(true);

        nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));

        await interaction.showModal(nameModal);
      }
    } else if (interaction.isModalSubmit()) {
      const registrationSystem = db.get(`registrationSystem_${interaction.guild.id}`);
      if (!registrationSystem) return;

      if (
        interaction.customId.startsWith("register_modal_") ||
        interaction.customId.startsWith("self_register_modal_")
      ) {
        const userId = interaction.customId.split("_")[2];
        const targetMember = await interaction.guild.members
          .fetch(userId)
          .catch(() => null);
        if (!targetMember) {
          return interaction.reply({
            content: "❌ | Kayıt edilecek kullanıcı bulunamadı!",
            ephemeral: true,
          });
        }

        const name = interaction.fields.getTextInputValue("user_name");
        const registeredRole = interaction.guild.roles.cache.get(
          registrationSystem.registeredRoleId
        );
        const unregisteredRole = interaction.guild.roles.cache.get(
          registrationSystem.unregisteredRoleId
        );
        const logChannel = interaction.guild.channels.cache.get(
          registrationSystem.logChannelId
        );

        if (!registeredRole || !unregisteredRole) {
          return interaction.reply({
            content: "❌ | Gerekli roller bulunamadı! Lütfen kurulumu kontrol edin.",
            ephemeral: true,
          });
        }

        const isStaffInitiated = interaction.customId.startsWith("register_modal_");
        const isSelfInitiated = interaction.customId.startsWith("self_register_modal_");

        if (isStaffInitiated) {
            if (!interaction.member.roles.cache.has(registrationSystem.staffRoleId) &&
                !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({
                    content: "❌ | Bu kaydı tamamlama yetkiniz yok.",
                    ephemeral: true,
                });
            }
        } else if (isSelfInitiated) {
            if (targetMember.id !== interaction.user.id) {
                return interaction.reply({
                    content: "❌ | Yalnızca kendi kaydınızı tamamlayabilirsiniz.",
                    ephemeral: true,
                });
            }
        }

        try {
          const newNickname = `${registrationSystem.tag} ${name}`;
          await targetMember.setNickname(newNickname);
          await targetMember.roles.remove(unregisteredRole);
          await targetMember.roles.add(registeredRole);
          db.set(`memberData_${targetMember.id}`, {
            name,
            registeredBy: isStaffInitiated ? interaction.user.id : targetMember.id,
            registeredAt: Date.now(),
          });

          const successEmbed = new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `✅ ${targetMember} başarıyla kayıt edildi!\n` +
                `**Yeni İsim**: \`${newNickname}\``
            )
            .setFooter({ text: `Kaydeden: ${interaction.user.tag}` });

          await interaction.reply({ embeds: [successEmbed], ephemeral: true });

          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor("Blue")
              .setTitle("Kullanıcı Kaydedildi")
              .setDescription(
                `• **Kaydedilen Kullanıcı**: ${targetMember}\n` +
                  `• **Kaydeden**: ${interaction.user}\n` +
                  `• **Verilen Rol**: ${registeredRole}\n` +
                  `• **Yeni Takma Ad**: \`${newNickname}\``
              )
              .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
              .setTimestamp()
              .setFooter({ text: `Kullanıcı ID: ${targetMember.id}` });
            
            logChannel.send({ embeds: [logEmbed] }).catch(console.error);
          }
        } catch (error) {
          console.error("Kayıt sırasında hata:", error);
          await interaction.reply({
            content: "❌ | Kayıt sırasında bir hata oluştu!",
            ephemeral: true,
          });
        }
      }
    }
  });

  client.on("guildMemberRemove", async (member) => {
    db.delete(`memberData_${member.id}`); // Üye ayrıldığında kayıt verilerini temizle
  });
}

// Komutları ve client olaylarını dışa aktar
module.exports = {
  commands: [
    {
      name: "registration-system",
      description: "Sunucu için kayıt sistemini kurar.",
      type: 1,
      options: [
        {
          name: "registration-channel",
          description: "Kayıt mesajlarının gönderileceği kanal.",
          type: 7,
          required: true,
          channel_types: [0], // Text channel
        },
        {
          name: "unregistered-role",
          description: "Kayıttan önce yeni üyelere atanan rol.",
          type: 8,
          required: true,
        },
        {
          name: "registered-role",
          description: "Başarılı kayıttan sonra üyelere atanan rol.",
          type: 8,
          required: true,
        },
        {
          name: "staff-role",
          description: "Kayıt yapmaya yetkili üyeler için rol.",
          type: 8,
          required: true,
        },
        {
          name: "tag",
          description: "Kullanıcının adının önüne eklenecek etiket (örneğin, '•').",
          type: 3,
          required: true,
        },
        {
          name: "log-channel",
          description: "Kayıt loglarının gönderileceği kanal.",
          type: 7,
          required: true,
          channel_types: [0],
        },
      ],
      run: async (client, interaction) => {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(
                  "❌ | Bu komutu kullanmak için **Yönetici** yetkisine ihtiyacınız var."
                ),
            ],
            ephemeral: true,
          });
        }

        const registrationChannel =
          interaction.options.getChannel("registration-channel");
        const unregisteredRole =
          interaction.options.getRole("unregistered-role");
        const registeredRole = interaction.options.getRole("registered-role");
        const staffRole = interaction.options.getRole("staff-role");
        const tag = interaction.options.getString("tag");
        const logChannel = interaction.options.getChannel("log-channel");

        const existingSetup = db.get(`registrationSystem_${interaction.guild.id}`);
        if (existingSetup) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(
                  "❌ | Kayıt sistemi zaten kurulu. Devre dışı bırakmak için `/disable-registration` kullanın."
                ),
            ],
            ephemeral: true,
          });
        }

        db.set(`registrationSystem_${interaction.guild.id}`, {
          registrationChannelId: registrationChannel.id,
          unregisteredRoleId: unregisteredRole.id,
          registeredRoleId: registeredRole.id,
          staffRoleId: staffRole.id,
          tag: tag,
          logChannelId: logChannel.id,
          setupTime: Date.now(),
        });

        const successEmbed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("Kayıt Sistemi Kurulumu Tamamlandı")
          .setDescription(
            `✅ Kayıt sistemi başarıyla yapılandırıldı!\n\n` +
              `**Kayıt Kanalı**: ${registrationChannel}\n` +
              `**Kayıtsız Rolü**: ${unregisteredRole}\n` +
              `**Kayıtlı Rolü**: ${registeredRole}\n` +
              `**Yetkili Rolü**: ${staffRole}\n` +
              `**Etiket**: \`${tag}\`\n` +
              `**Log Kanalı**: ${logChannel}`
          )
          .setFooter({ text: `Kurulumu yapan: ${interaction.user.tag}` });

        return interaction.reply({ embeds: [successEmbed], ephemeral: false });
      },
    },
    {
      name: "register-user",
      description: "Bir kullanıcıyı belirli bir isimle kaydeder.",
      type: 1,
      options: [
        {
          name: "user",
          description: "Kaydedilecek kullanıcı.",
          type: 6, // User type
          required: true,
        },
      ],
      run: async (client, interaction) => {
        const registrationSystem = db.get(`registrationSystem_${interaction.guild.id}`);
        if (!registrationSystem) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription("❌ | Bu sunucuda kayıt sistemi kurulu değil!"),
            ],
            ephemeral: true,
          });
        }

        if (
          !interaction.member.roles.cache.has(registrationSystem.staffRoleId) &&
          !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(
                  "❌ | Bu komutu kullanmak için **Yetkili Rolü** veya **Yönetici** iznine ihtiyacınız var."
                ),
            ],
            ephemeral: true,
          });
        }

        const targetUser = interaction.options.getMember("user");

        const nameModal = new ModalBuilder()
          .setCustomId(`register_modal_${targetUser.id}`)
          .setTitle("Kullanıcının Adını Girin");

        const nameInput = new TextInputBuilder()
          .setCustomId("user_name")
          .setLabel("İsim")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Kullanıcının adını girin")
          .setRequired(true);

        nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));

        await interaction.showModal(nameModal);
      },
    },
    {
      name: "disable-registration",
      description: "Kayıt sistemini devre dışı bırakır.",
      type: 1,
      run: async (client, interaction) => {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription(
                  "❌ | Bu komutu kullanmak için **Yönetici** iznine ihtiyacınız var."
                ),
            ],
            ephemeral: true,
          });
        }

        const registerSystem = db.get(`registrationSystem_${interaction.guild.id}`);
        if (!registerSystem) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setDescription("❌ | Kayıt sistemi zaten devre dışı!"),
            ],
            ephemeral: true,
          });
        }

        db.delete(`registrationSystem_${interaction.guild.id}`);

        const successEmbed = new EmbedBuilder()
          .setColor("Green")
          .setDescription("✅ | Kayıt sistemi başarıyla devre dışı bırakıldı!")
          .setFooter({ text: `İşlemi yapan: ${interaction.user.tag}` });

        return interaction.reply({ embeds: [successEmbed], ephemeral: false });
      },
    },
  ],
  initialize, // Olay dinleyicilerini başlatmak için fonksiyonu dışa aktar
};
