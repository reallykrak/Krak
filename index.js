const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path"); // path modülü eklendi
const config = require("./config.json");
const { loadEvents } = require("./function/eventLoader");
// const { loadCommands } = require("./function/commandLoader"); // Bu satırı siliyoruz veya yorum satırı yapıyoruz

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

// Olayları yükle (eventLoader.js dosyanız bu kısmı hallediyor)
loadEvents(client);

// ========================================================================
// YENİ ve GÜNCELLENMİŞ KOMUT YÜKLEME BÖLÜMÜ
// ========================================================================
// Eski loadCommands(client); çağrısı yerine bu bölüm geldi.
// Bu kod, hem eski komut dosyalarını hem de yeni modüler (initialize içeren) dosyaları tanır.

console.log("--------------------");
console.log("Komutlar Yükleniyor...");
const commandsPath = path.join(__dirname, 'commands'); // Komutların 'commands' klasöründe olduğunu varsayıyoruz.

// 'commands' klasörü yoksa hata ver ve çık.
if (!fs.existsSync(commandsPath)) {
    console.error(`[HATA] 'commands' klasörü bulunamadı! Lütfen botun ana dizininde bu klasörü oluşturun.`);
    process.exit(1);
}

const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        try {
            const commandOrModule = require(filePath);

            // Yeni modüler yapıyı kontrol et (hem komutlar hem de initialize fonksiyonu var mı?)
            if (commandOrModule.commands && typeof commandOrModule.initialize === 'function') {
                console.log(`[MODÜL] ${file} yükleniyor...`);
                // Komutları yükle
                commandOrModule.commands.forEach(cmd => {
                    if (cmd.name && cmd.run) {
                        client.commands.set(cmd.name, cmd);
                        console.log(` -> Komut yüklendi: /${cmd.name}`);
                    } else {
                        console.log(`[HATA] ${filePath} içindeki bir komut 'name' veya 'run' içermiyor.`);
                    }
                });
                // Olay dinleyicilerini (initialize) başlat
                commandOrModule.initialize(client);
                console.log(` -> Olay dinleyicileri başlatıldı: ${file}`);
            }
            // Eski yapı (komut dizisi)
            else if (Array.isArray(commandOrModule)) {
                 console.log(`[DİZİ] ${file} yükleniyor...`);
                 commandOrModule.forEach(cmd => {
                    if (cmd.name && cmd.run) {
                       client.commands.set(cmd.name, cmd);
                       console.log(` -> Komut yüklendi: /${cmd.name}`);
                    }
                 });
            }
            // Eski yapı (tek komut)
            else if (commandOrModule.name && commandOrModule.run) {
                console.log(`[TEK] ${file} yükleniyor...`);
                client.commands.set(commandOrModule.name, commandOrModule);
                console.log(` -> Komut yüklendi: /${commandOrModule.name}`);
            } else {
                 console.log(`[UYARI] ${file} dosyası geçerli bir komut yapısı içermiyor, atlanıyor.`);
            }
        } catch (error) {
            console.error(`[HATA] ${file} dosyası yüklenemedi:`, error);
        }
    }
}
console.log("Tüm komutlar ve modüller başarıyla yüklendi.");
console.log("--------------------");

// ========================================================================
// KOMUT YÜKLEME BÖLÜMÜ SONU
// ========================================================================


client.login(config.token);
  
