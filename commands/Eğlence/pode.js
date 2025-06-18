const {
  Client,
  EmbedBuilder,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  ChannelType,
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require("@discordjs/voice");
const path = require("path");

module.exports = {
  name: "pode",
  description: "Kullanıcıyı ses kanalına taşır ve Pode Sentar müziğini çalar!",
  type: 1,
  options: [
    {
      name: "kullanici",
      description: "Etiketlenecek kişi",
      type: 6, // USER
      required: true,
    },
    {
      name: "kanal",
      description: "Ses kanalı seçin",
      type: 7, // CHANNEL
      channel_types: [ChannelType.GuildVoice],
      required: true,
    },
  ],
  run: async (client, interaction) => {
    // permissions artık memberPermissions olarak çağrılır (discord.js v14+)
    if (
      !interaction.memberPermissions?.has(PermissionsBitField.Flags.MoveMembers)
    ) {
      return interaction.reply({
        content: "❌ | Üyeleri taşıma yetkiniz yok!",
        ephemeral: true,
      });
    }

    const target = interaction.options.getMember("kullanici");
    const voiceChannel = interaction.options.getChannel("kanal");

    if (!target) {
      return interaction.reply({
        content: "❌ | Kullanıcı bulunamadı!",
        ephemeral: true,
      });
    }

    if (!target.voice.channel) {
      return interaction.reply({
        content: "❌ | Bu kullanıcı zaten bir ses kanalında değil!",
        ephemeral: true,
      });
    }

    try {
      await target.voice.setChannel(voiceChannel);

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      const player = createAudioPlayer();
      const resource = createAudioResource(
        path.join(__dirname, "../../../assets/pode-sentar.mp3")
      );
      player.play(resource);
      connection.subscribe(player);

      const embed = new EmbedBuilder()
        .setTitle("🎵 Pode Sentar Aktif!")
        .setDescription(
          `${target} kullanıcısı **${voiceChannel.name}** kanalına taşındı. Pode Sentar başlatıldı!`
        )
        .setColor("Random");

      await interaction.reply({ embeds: [embed] });

      setTimeout(() => {
        player.stop();
        connection.destroy();
      }, 60_000);
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content:
          "❌ | Bir hata oluştu. Botun gerekli yetkilere sahip olduğundan emin olun!",
        ephemeral: true,
      });
    }
  },
};
