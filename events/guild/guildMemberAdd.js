import { EmbedBuilder, AttachmentBuilder, PermissionsBitField } from 'discord.js';
import fdb from 'croxydb';
import { CaptchaGenerator } from 'captcha-canvas';

export const event = {
    name: 'guildMemberAdd',
    execute: async (member) => {
        try {
            const captchaData = fdb.get(`captcha_${member.guild.id}`);
            if (!captchaData) return;

            const { channel, role } = await getChannelAndRole(member.guild, captchaData);
            if (!channel || !role) return;

            const captcha = await generateCaptcha();
            if (!captcha) {
                console.error('Captcha generation failed');
                return;
            }

            const message = await sendCaptchaMessage(channel, member, captcha);
            if (!message) return;

            const userResponse = await getUserResponse(channel, member);
            await handleCaptchaResponse(member, channel, role, userResponse, captcha.text, message);
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
            await handleCaptchaError(member, error);
        }
    }
};

async function getChannelAndRole(guild, captchaData) {
    const channel = guild.channels.cache.get(captchaData.channelId);
    const role = guild.roles.cache.get(captchaData.roleId);
    return { channel, role };
}

async function generateCaptcha() {
    try {
        const options = { height: 200, width: 600, noise: 5 };
        const captcha = new CaptchaGenerator(options);
        const text = captcha.text;
        const buffer = await captcha.generate();
        return { image: buffer, text: text };
    } catch (error) {
        console.error('Error generating captcha:', error);
        return null;
    }
}

async function sendCaptchaMessage(channel, member, captcha) {
    try {
        const attachment = new AttachmentBuilder(captcha.image, { name: 'captcha.png' });
        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('Captcha Doğrulaması')
            .setDescription(`Merhaba ${member}, lütfen aşağıdaki captcha kodunu girerek doğrulama yapın.`)
            .setImage('attachment://captcha.png')
            .setFooter({ text: `${member.guild.name} • Doğrulama için 2 dakikanız var.` });

        return await channel.send({ content: member.toString(), embeds: [embed], files: [attachment] });
    } catch (error) {
        console.error('Error sending captcha message:', error);
        return null;
    }
}

async function getUserResponse(channel, member) {
    try {
        const collected = await channel.awaitMessages({
            filter: (m) => m.author.id === member.id,
            max: 1,
            time: 120000,
            errors: ['time']
        });
        return collected.first().content.trim().toLowerCase();
    } catch (error) {
        console.error('Error getting user response:', error);
        throw error;
    }
}

async function handleCaptchaResponse(member, channel, role, userResponse, correctCaptcha, message) {
    try {
        if (userResponse === correctCaptcha.toLowerCase()) {
            await member.roles.add(role);
            await message.delete();
            await sendSuccessMessage(channel, member, role);
        } else {
            await handleFailedCaptcha(member, channel, message);
        }
    } catch (error) {
        console.error('Error handling captcha response:', error);
        await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setDescription('Captcha işlemi sırasında bir hata oluştu. Lütfen sunucu yöneticisine başvurun.')
            ]
        });
    }
}

async function sendSuccessMessage(channel, member, role) {
    await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor('#2ecc71')
                .setDescription(`${member} başarıyla doğrulandı ve ${role} rolü verildi.`)
        ]
    });
}

async function handleFailedCaptcha(member, channel, message) {
    const canKick = member.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers);

    if (canKick) {
        await member.kick('Captcha doğrulaması başarısız.');
        await message.delete();
        await sendFailureMessage(channel, member, true);
    } else {
        await sendFailureMessage(channel, member, false);
    }
}

async function sendFailureMessage(channel, member, wasKicked) {
    const description = wasKicked
        ? `${member} captcha doğrulamasını geçemedi ve sunucudan atıldı.`
        : `${member} captcha doğrulamasını geçemedi ancak botun sunucudan atma yetkisi yok.`;

    await channel.send({
        embeds: [
            new EmbedBuilder()
                .setColor('#e74c3c')
                .setDescription(description)
        ]
    });
}

async function handleCaptchaError(member, error) {
    console.error('Captcha error:', error);
    try {
        const channel = member.guild.systemChannel || member.guild.channels.cache.first();
        if (channel) {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#e74c3c')
                        .setDescription(`${member} için captcha işlemi sırasında bir hata oluştu. Lütfen manuel olarak kontrol edin.`)
                ]
            });
        }
    } catch (sendError) {
        console.error('Error sending error message:', sendError);
    }
        }
