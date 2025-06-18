const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pode')
    .setDescription('Bir kişiyi ses kanalına taşı ve Pide Sentar çal')
    .addUserOption(option =>
      option.setName('kullanici')
        .setDescription('Taşınacak kişi')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('kanal')
        .setDescription('Taşınacağı ses kanalı')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)),

  async execute(interaction) {
    const target = interaction.options.getMember('kullanici');
    const voiceChannel = interaction.options.getChannel('kanal');

    if (!target.voice.channel) {
      return interaction.reply({ content: 'Bu kullanıcı bir ses kanalında değil.', ephemeral: true });
    }

    try {
      // Kullanıcıyı taşı
      await target.voice.setChannel(voiceChannel);

      // Bot da aynı kanala katılsın
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      // Müzik oynatıcı
      const player = createAudioPlayer();
      const resource = createAudioResource(path.join(__dirname, '../../assets/pide-sentar.mp3')); // müziği assets klasörüne koy
      player.play(resource);
      connection.subscribe(player);

      interaction.reply(`🎵 ${target} kullanıcısı **${voiceChannel.name}** kanalına taşındı ve Pide Sentar başlatıldı.`);

      // 1 dakika sonra çık
      setTimeout(() => {
        player.stop();
        connection.destroy();
      }, 60_000);

    } catch (error) {
      console.error(error);
      interaction.reply({ content: 'Bir hata oluştu. Botun gerekli yetkileri olduğundan emin olun.', ephemeral: true });
    }
  },
};
