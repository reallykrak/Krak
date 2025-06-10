// Gerekli modülleri ve kütüphaneleri içe aktar
import { Client, GatewayIntentBits, Partials, Collection, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import fs from 'fs';
import { config } from './config.js'; // Ayar dosyasını içe aktar

// Client (Bot) objesini oluştur
// İkinci kod parçasındaki gibi daha kapsamlı intent'ler (izinler) ve partial'lar kullanıldı.
// Bu, botun daha fazla olaya tepki verebilmesini sağlar.
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
    ],
});

// Ayarları ve Collection'ları client objesine ekle
// Collection'lar, Map objesinin gelişmiş bir versiyonudur ve komutları, olayları, bekleme sürelerini saklamak için idealdir.
client.config = config;
client.commands = new Collection();
client.events = new Collection();
client.cooldowns = new Collection(); // İlk kod parçasından gelen faydalı bir özellik

// Discord API ile iletişim kurmak için REST modülünü hazırla
const rest = new REST({ version: '10' }).setToken(config.bot.token);

// --- KOMUT YÜKLEYİCİ ---
const slashCommands = [];
const commandFiles = fs.readdirSync('./src/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        // Dinamik import ile her bir komut dosyasını yükle
        const commandModule = await import(`./src/commands/${file}`);
        const command = commandModule.default; // export default varsayılıyor

        if (command && command.data) {
            client.commands.set(command.data.name, command);
            slashCommands.push(command.data.toJSON());
            log.info(`[KOMUT] ${command.data.name} yüklendi.`);
        } else {
            log.warn(`[KOMUT] ${file} dosyasında 'data' bulunamadı, yüklenmedi.`);
        }
    } catch (error) {
        log.error(`[KOMUT] ${file} yüklenirken bir hata oluştu:`, error);
    }
}

// --- OLAY (EVENT) YÜKLEYİCİ ---
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    try {
        // Dinamik import ile her bir olay dosyasını yükle
        const eventModule = await import(`./src/events/${file}`);
        const event = eventModule.default; // export default varsayılıyor

        if (event && event.name) {
            client.events.set(event.name, event);
            // Olay tek seferlik ise 'once', değilse 'on' ile dinleyiciye ekle
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            log.info(`[OLAY] ${event.name} yüklendi.`);
        } else {
            log.warn(`[OLAY] ${file} dosyasında 'name' bulunamadı, yüklenmedi.`);
        }
    } catch (error) {
        log.error(`[OLAY] ${file} yüklenirken bir hata oluştu:`, error);
    }
}


// Bot hazır olduğunda slash komutlarını Discord'a kaydet
client.once('ready', async () => {
    try {
        log.info(`[REST] ${slashCommands.length} adet slash komutu yenileniyor...`);
        
        // Komutları global olarak kaydetmek için applicationCommands
        const data = await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands },
        );

        log.info(`[REST] ${data.length} adet slash komutu başarıyla yüklendi.`);
        log.info(`[BOT] ${client.user.tag} olarak giriş yapıldı ve bot hazır!`);
    } catch (error) {
        log.error('[REST] Slash komutları kaydedilirken hata oluştu:', error);
    }
});


// Bota giriş yap
client.login(config.bot.token);
  
