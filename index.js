const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");
const { loadEvents } = require("./function/eventLoader");
const { loadCommands } = require("./function/commandLoader");

// YENİ: Destek sisteminin etkileşimlerini yönetecek fonksiyonu içeri aktarıyoruz.
// Lütfen dosya yolunun doğru olduğundan emin olun.
const { handleInteractions } = require("./commands/Genel/destek-ayarla.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ],
});

client.commands = new Collection();
client.config = config;
client.cooldowns = new Collection();
global.client = client;

loadEvents(client);
loadCommands(client);

// YENİ: Sunucudaki tüm etkileşimleri (komut, buton, menü vb.) dinlemek için olay dinleyicisi.
client.on('interactionCreate', async (interaction) => {
    // Sizin mevcut komut sisteminiz büyük ihtimalle 'events' klasörünüzdeki bir dosyada
    // benzer bir mantıkla çalışıyordur. Buradaki temel amaç, komutlar dışındaki
    // buton ve menü gibi etkileşimleri de yakalamaktır.

    // Destek sisteminin buton, menü ve modal gibi etkileşimlerini yönetir.
    // Bu fonksiyon, sadece destek sistemine ait customId'lere sahip etkileşimlerle ilgilenir.
    if (interaction.guild) { // Etkileşimlerin sadece sunucu içinde olduğundan emin olalım
        handleInteractions(interaction);
    }

    // Normal slash komutlarınızı çalıştırmak için (eğer event loader'ınız bunu zaten yapmıyorsa)
    // aşağıdaki gibi bir bloğa ihtiyacınız olabilir. Genellikle bu tür bir kod
    // 'events/interactionCreate.js' gibi bir dosyada bulunur.
    if (interaction.isCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) {
            try {
                // Komutun kendi 'run' veya 'execute' fonksiyonunu çağırır.
                // Eğer komutlarınız 'destek-ayarla.js' dosyasındaki gibi 'run' metodu kullanıyorsa bu satır doğrudur.
                await command.run(client, interaction);
            } catch (error) {
                console.error(`Komut çalıştırılırken hata oluştu: ${interaction.commandName}`, error);
                await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu!', ephemeral: true });
            }
        }
    }
});


client.login(config.token);
    
