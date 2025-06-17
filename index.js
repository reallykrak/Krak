const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const config = require("./config.json");
const { loadEvents } = require("./function/eventLoader");
const { loadCommands } = require("./function/commandLoader");

// GEREKLİ: Komutları veya özel etkileşimleri yöneten dosyalar import edilecekse,
// onların doğrudan bir `handleInteractions` fonksiyonu export ettiğinden emin olun.
const destekKomut = require("./commands/Genel/destek-ayarla.js"); // Bu komut bir modül olduğu için export'u doğru tanımak gerek.

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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.guild) return;

  // Slash komut kontrolü
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.run(client, interaction);
    } catch (err) {
      console.error(`[HATA] Komut çalıştırılırken: ${interaction.commandName}`, err);
      await interaction.reply({ content: "❌ | Komut çalıştırılırken bir hata oluştu.", ephemeral: true });
    }
  }

  // Eğer destek sistemi gibi özel bir etkileşim varsa, buradan yönlendir.
  // Ancak destek-ayarla.js dosyasında doğrudan `client.on(...)` varsa o kısmı KALDIRMALISIN.
  // Bunun yerine destek sistemi sadece bir komut olmalı.
  // Eğer interaction customId gibi şeyler içeriyorsa, bunlar ayrı bir `event handler` içinde olmalı.
});

// Botu başlat
client.login(config.token);
