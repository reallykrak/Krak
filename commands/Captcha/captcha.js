import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionsBitField } from 'discord.js';
import fdb from 'croxydb';

const data = new SlashCommandBuilder()
    .setName('captcha')
    .setDescription('Captcha sistemini yönet')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('ayarla')
            .setDescription('Captcha sistemini ayarla')
            .addChannelOption(option => option.setName('kanal').setDescription('Captcha kanalı').setRequired(true).addChannelTypes(ChannelType.GuildText))
            .addRoleOption(option => option.setName('rol').setDescription('Doğrulanmış kullanıcı rolü').setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('kapat')
            .setDescription('Captcha sistemini kapat'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('bilgi')
            .setDescription('Captcha sistemi hakkında bilgi al'));

const run = async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();
    const embed = new EmbedBuilder().setFooter({ text: `${interaction.guild.name} • ${new Date().toLocaleDateString()}` });

    if (subcommand === 'ayarla') {
        const channel = interaction.options.getChannel('kanal');
        const role = interaction.options.getRole('rol');

        fdb.set(`captcha_${interaction.guild.id}`, { channelId: channel.id, roleId: role.id });

        embed
            .setColor('#3498db')
            .setTitle('Captcha Sistemi Ayarlandı')
            .addFields(
                { name: 'Captcha Kanalı', value: channel.toString(), inline: true },
                { name: 'Doğrulanmış Rol', value: role.toString(), inline: true }
            );

    } else if (subcommand === 'kapat') {
        fdb.delete(`captcha_${interaction.guild.id}`);

        embed
            .setColor('#e74c3c')
            .setTitle('Captcha Sistemi Kapatıldı')
            .setDescription('Sistem başarıyla devre dışı bırakıldı.');

    } else if (subcommand === 'bilgi') {
        const captchaData = fdb.get(`captcha_${interaction.guild.id}`);

        if (!captchaData) {
            embed
                .setColor('#f1c40f')
                .setTitle('Captcha Sistemi Bilgisi')
                .setDescription('Bu sunucuda captcha sistemi aktif değil.');
        } else {
            const channel = interaction.guild.channels.cache.get(captchaData.channelId);
            const role = interaction.guild.roles.cache.get(captchaData.roleId);

            embed
                .setColor('#2ecc71')
                .setTitle('Captcha Sistemi Bilgisi')
                .addFields(
                    { name: 'Captcha Kanalı', value: channel ? channel.toString() : 'Bulunamadı', inline: true },
                    { name: 'Doğrulanmış Rol', value: role ? role.toString() : 'Bulunamadı', inline: true }
                );
        }
    }

    await interaction.reply({ embeds: [embed] });
};

export default { data, run };
