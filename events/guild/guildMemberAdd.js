import { EmbedBuilder, AttachmentBuilder, PermissionsBitField } from 'discord.js';
import fdb from 'croxydb';
import Jimp from 'jimp';

export const event = {
    name: 'guildMemberAdd',
    execute: async (member) => {
        try {
            // Captcha ayarlarını al
            const captchaData = fdb.get(`captcha_${member.guild.id}`);
            if (!captchaData) return;

            const { channel, role } = await getChannelAndRole(member.guild, captchaData);
            if (!channel || !role) return;

            // Captcha resmi ve metni üret
            const captcha = await generateCaptcha();
            if (!captcha) {
                console.error('Captcha generation failed');
                return;
            }

            // Captcha mesajını gönder
            const message = await sendCaptchaMessage(channel, member, captcha);
            if (!message) return;

            // Kullanıcının cevabını bekle
            const userResponse = await getUserResponse(channel, member);

            // Gelen cevaba göre işlemleri yap
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
        const width = 600;
        const height = 200;

        const image = new Jimp(width, height, 0xffffffff);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < 6; i++) {
            text += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);

        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text, width);
        image.print(font, (width - textWidth) / 2, (height - textHeight) / 2, text);

        // Basit renkli gürültü (noise)
        for (let i = 0; i < 1000; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const color = Jimp.rgbaToInt(
                Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                Math.floor(Math.random() * 256),
                255
            );
            image.setPixelColor(color, x, y);
        }

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
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
