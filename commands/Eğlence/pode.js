const {
  Client,
  EmbedBuilder,
  PermissionsBitField, // İzinleri kontrol etmek için gerekli
  ActionRowBuilder,   // Butonlar ve diğer bileşenler için gerekli
  ButtonBuilder,      // Butonlar için gerekli
  ButtonStyle,        // Buton stilleri için gerekli
  ModalBuilder,       // Modallar (pop-up formlar) için gerekli
  TextInputBuilder,   // Modal içindeki metin giriş alanları için gerekli
  TextInputStyle,     // Metin giriş stilleri için gerekli
  InteractionType,    // Etkileşim türlerini kontrol etmek için gerekli (örn. komut, buton)
  ChannelType,        // Kanal türlerini belirtmek için gerekli (örn. GUILD_VOICE)
} = require("discord.js");

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require("@discordjs/voice");
const path = require("path");

// Bu blok, module.exports = { ... } kısmının dışında kalan gerekli tanımlamaları içerir.
// Eğer bu kod bloğu bir komut dosyasının içindeyse (örneğin 'run' fonksiyonunun üstünde),
// zaten uygun bir yerde demektir. Amacımız, 'PermissionsBitField' gibi referans hatalarını çözmekti.

module.exports = {
  name: "pode",
  description: "Kullanıcıyı ses kanalına taşır ve Pode Sentar müziğini çalar!",
  type: 1, // APPLICATION_COMMAND_TYPE.CHAT_INPUT
  options: [
    {
      name: "kullanici",
      description: "Taşınacak kişi",
      type: 6, // ApplicationCommandOptionType.User
      required: true,
    },
    {
      name: "kanal",
      description: "Kullanıcının taşınacağı ses kanalı",
      type: 7, // ApplicationCommandOptionType.Channel
      channel_types: [2], // ChannelType.GuildVoice
      required: true,
    },
  ],
  run: async (client, interaction) => {
    // Check if the interacting member has the necessary permission to move members.
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
      return interaction.reply({
        content: "❌ | Üyeleri Taşı yetkiniz yok! Bu komutu kullanmak için 'Üyeleri Taşı' yetkisine sahip olmalısınız.",
        ephemeral: true,
      });
    }

    const target = interaction.options.getMember("kullanici");
    const voiceChannel = interaction.options.getChannel("kanal");

    // Check if the target user is in a voice channel
    if (!target.voice.channel) {
      return interaction.reply({
        content: "❌ | Bu kullanıcı şu anda bir ses kanalında değil. Lütfen ses kanalında olan bir kullanıcıyı seçin.",
        ephemeral: true,
      });
    }

    // Check if the bot has permissions to connect and speak in the target voice channel
    const botPermissionsInChannel = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!botPermissionsInChannel.has(PermissionsBitField.Flags.Connect) || !botPermissionsInChannel.has(PermissionsBitField.Flags.Speak)) {
        return interaction.reply({
            content: "❌ | Bu ses kanalına katılmak veya konuşmak için yeterli yetkim yok. Lütfen botun 'Bağlan' ve 'Konuş' yetkilerine sahip olduğundan emin olun.",
            ephemeral: true,
        });
    }

    try {
      // Attempt to move the target user to the specified voice channel
      await target.voice.setChannel(voiceChannel);

      // Join the specified voice channel
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false, // Bot will not be self-deafened
      });

      // Wait for the connection to be ready (up to 30 seconds)
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      const player = createAudioPlayer();

      // Construct the absolute path to the audio file
      // IMPORTANT: Adjust this path if your 'assets' folder is located differently.
      // Assuming 'pode.js' is in 'your_bot_root/commands/category/pode.js' and 'assets' is in 'Krak/commands/Eğlence'.
      const audioFilePath = path.join(__dirname, "../../../assets/pode-sentar.mp3");

      const resource = createAudioResource(audioFilePath);
      player.play(resource);
      connection.subscribe(player); // Connect the player to the voice connection

      const embed = new EmbedBuilder()
        .setTitle("🎵 Pode Sentar Aktif!")
        .setDescription(`${target} kullanıcısı **${voiceChannel.name}** kanalına taşındı ve Pode Sentar başlatıldı!`)
        .setColor("Random")
        .setTimestamp(); // Add a timestamp for better context

      await interaction.reply({ embeds: [embed] });

      // Set a timeout to stop the player and destroy the connection after 60 seconds
      setTimeout(() => {
        if (player.state.status !== AudioPlayerStatus.Idle) { // Only stop if it's not already idle
            player.stop();
        }
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) { // Only destroy if not already destroyed
            connection.destroy();
        }
        console.log(`Pode Sentar playback finished and connection destroyed for ${interaction.guild.name}.`);
      }, 60 * 1000); // 60 seconds
    } catch (err) {
      console.error("Pode Sentar command error:", err); // Log the full error for debugging

      let errorMessage = "❌ | Bir hata oluştu.";
      if (err.message.includes("Couldn't find an available voice channel to connect to!")) {
        errorMessage += " Bot, belirtilen ses kanalına bağlanamadı. Kanalın dolu olmadığından veya botun engellenmediğinden emin olun.";
      } else if (err.message.includes("Missing Permissions")) {
          errorMessage += " Botun, kullanıcıyı taşımak veya ses kanalına katılmak için yeterli yetkisi yok. Lütfen botun 'Üyeleri Taşı', 'Bağlan' ve 'Konuş' yetkilerine sahip olduğundan emin olun.";
      } else if (err.message.includes("No audio resources to play")) {
          errorMessage += " Ses dosyası bulunamadı veya oynatılamadı. `pode-sentar.mp3` dosyasının doğru yolda olduğundan ve bozuk olmadığından emin olun.";
      } else {
        errorMessage += " Lütfen botun gerekli yetkilere sahip olduğundan ve her şeyin doğru yapılandırıldığından emin olun.";
      }

      return interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  },
};
        
