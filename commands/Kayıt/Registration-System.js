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

module.exports = [
  {
    name: "Registration-System",
    description: "Sets up the registration system for the server.",
    type: 1,
    options: [
      {
        name: "registration-channel",
        description: "The channel where registration messages will be sent.",
        type: 7,
        required: true,
        channel_types: [0], // Text channel
      },
      {
        name: "unregistered-role",
        description: "The role assigned to new members before registration.",
        type: 8,
        required: true,
      },
      {
        name: "registered-role",
        description: "The role assigned to members after successful registration.",
        type: 8,
        required: true,
      },
      {
        name: "staff-role",
        description: "The role for members authorized to perform registrations.",
        type: 8,
        required: true,
      },
      {
        name: "tag",
        description: "The tag to be added before the user's name (e.g., '•').",
        type: 3,
        required: true,
      },
      {
        name: "log-channel",
        description: "The channel where registration logs will be sent.",
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
                "❌ | You need **Administrator** permission to use this command."
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
                "❌ | Registration system is already set up. Use `/disable-registration` to disable it."
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
        .setTitle("Registration System Setup Complete")
        .setDescription(
          `✅ Registration system has been successfully configured!\n\n` +
            `**Registration Channel**: ${registrationChannel}\n` +
            `**Unregistered Role**: ${unregisteredRole}\n` +
            `**Registered Role**: ${registeredRole}\n` +
            `**Staff Role**: ${staffRole}\n` +
            `**Tag**: \`${tag}\`\n` +
            `**Log Channel**: ${logChannel}`
        )
        .setFooter({ text: `Setup by: ${interaction.user.tag}` });

      return interaction.reply({ embeds: [successEmbed], ephemeral: false });
    },
  },
  {
    name: "register-user",
    description: "Registers a user with a given name.",
    type: 1,
    options: [
      {
        name: "user",
        description: "The user to be registered.",
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
              .setDescription("❌ | Registration system is not set up on this server!"),
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
                "❌ | You need the **Staff Role** or **Administrator** permission to use this command."
              ),
          ],
          ephemeral: true,
        });
      }

      const targetUser = interaction.options.getMember("user");

      const registerEmbed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("User Registration Panel")
        .setDescription(
          `Please provide the name for ${targetUser}.\n\n` +
          `*Note: The tag will be automatically added.*`
        )
        .setFooter({ text: `Registrar: ${interaction.user.tag}` });

      const nameModal = new ModalBuilder()
        .setCustomId(`register_modal_${targetUser.id}`)
        .setTitle("Enter User's Name");

      const nameInput = new TextInputBuilder()
        .setCustomId("user_name")
        .setLabel("Name")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter the user's name")
        .setRequired(true);

      nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));

      await interaction.showModal(nameModal);
    },
  },
  {
    name: "disable-registration",
    description: "Disables the registration system.",
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
                "❌ | You need **Administrator** permission to use this command."
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
              .setDescription("❌ | Registration system is already disabled!"),
          ],
          ephemeral: true,
        });
      }

      db.delete(`registrationSystem_${interaction.guild.id}`);

      const successEmbed = new EmbedBuilder()
        .setColor("Green")
        .setDescription("✅ | Registration system has been successfully disabled!")
        .setFooter({ text: `Action by: ${interaction.user.tag}` });

      return interaction.reply({ embeds: [successEmbed], ephemeral: false });
    },
  },
];

client.on("guildMemberAdd", async (member) => {
  const registrationSystem = db.get(`registrationSystem_${member.guild.id}`);
  if (!registrationSystem) return;

  const unregisteredRole = member.guild.roles.cache.get(
    registrationSystem.unregisteredRoleId
  );
  if (!unregisteredRole) {
    console.error("Unregistered role not found.");
    return;
  }

  try {
    await member.setNickname(`${registrationSystem.tag} New Member`); // Default nickname with tag
    await member.roles.add(unregisteredRole);
  } catch (error) {
    console.error("Error updating member settings:", error);
  }

  const registrationChannel = member.guild.channels.cache.get(
    registrationSystem.registrationChannelId
  );
  if (!registrationChannel) {
    console.error("Registration channel not found.");
    return;
  }

  const welcomeEmbed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle(`Welcome to ${member.guild.name}!`)
    .setDescription(
      `${member}, welcome to our server! Please click the button below to register or contact a staff member.`
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

  const registerButton = new ButtonBuilder()
    .setCustomId(`initiate_register_${member.id}`)
    .setLabel("Register Now")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📝");

  const row = new ActionRowBuilder().addComponents(registerButton);

  registrationChannel
    .send({
      content: `Welcome, ${member}!`,
      embeds: [welcomeEmbed],
      components: [row],
    })
    .catch(console.error);
});

client.on("interactionCreate", async (interaction) => {
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
          content: "❌ | You can only initiate registration for yourself.",
          ephemeral: true,
        });
      }

      // Check if the user is already registered (has the registered role)
      if (targetMember.roles.cache.has(registrationSystem.registeredRoleId)) {
        return interaction.reply({
          content: "✅ | You are already registered!",
          ephemeral: true,
        });
      }

      const nameModal = new ModalBuilder()
        .setCustomId(`self_register_modal_${targetMember.id}`)
        .setTitle("Enter Your Name");

      const nameInput = new TextInputBuilder()
        .setCustomId("user_name")
        .setLabel("Name")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Enter your desired name")
        .setRequired(true);

      nameModal.addComponents(new ActionRowBuilder().addComponents(nameInput));

      await interaction.showModal(nameModal);
    }
  } else if (interaction.isModalSubmit()) {
    const registrationSystem = db.get(`registrationSystem_${interaction.guild.id}`);
    if (!registrationSystem) return;

    if (
      interaction.customId.startsWith("register_modal_") || // For staff-initiated registration
      interaction.customId.startsWith("self_register_modal_") // For self-registration
    ) {
      const userId = interaction.customId.split("_")[2];
      const targetMember = await interaction.guild.members
        .fetch(userId)
        .catch(() => null);
      if (!targetMember) {
        return interaction.reply({
          content: "❌ | User to be registered not found!",
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
          content: "❌ | Required roles not found! Please check setup.",
          ephemeral: true,
        });
      }

      // Check if the interaction is from a staff member or the user themselves
      const isStaffInitiated = interaction.customId.startsWith("register_modal_");
      const isSelfInitiated = interaction.customId.startsWith("self_register_modal_");

      if (isStaffInitiated) {
          if (!interaction.member.roles.cache.has(registrationSystem.staffRoleId) &&
              !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
              return interaction.reply({
                  content: "❌ | You do not have permission to complete this registration.",
                  ephemeral: true,
              });
          }
      } else if (isSelfInitiated) {
          if (targetMember.id !== interaction.user.id) {
              return interaction.reply({
                  content: "❌ | You can only complete registration for yourself.",
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
          registeredBy: isStaffInitiated ? interaction.user.id : targetMember.id, // If staff initiated, set staff ID, else set user ID
          registeredAt: Date.now(),
        });

        const successEmbed = new EmbedBuilder()
          .setColor("Green")
          .setDescription(
            `✅ ${targetMember} has been successfully registered!\n` +
              `**New Name**: \`${newNickname}\``
          )
          .setFooter({ text: `Registered by: ${interaction.user.tag}` });

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        // Send detailed log to the log channel
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("User Registered")
            .setDescription(
              `• **Registered User**: ${targetMember}\n` +
                `• **Registered By**: ${interaction.user}\n` +
                `• **Assigned Role**: ${registeredRole}\n` +
                `• **New Nickname**: \`${newNickname}\``
            )
            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: `User ID: ${targetMember.id}` });
          
          logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }
      } catch (error) {
        console.error("Error during registration:", error);
        await interaction.reply({
          content: "❌ | An error occurred during registration!",
          ephemeral: true,
        });
      }
    }
  }
});

client.on("guildMemberRemove", async (member) => {
  db.delete(`memberData_${member.id}`); // Clear registration data on member leave
});
