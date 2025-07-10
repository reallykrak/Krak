const {
  EmbedBuilder,
  ApplicationCommandType,
  ApplicationCommandOptionType,
} = require("discord.js");
const axios = require("axios");

module.exports = {
  // --- Komutun Temel Bilgileri ---
  name: "chat",
  description: "Yapay zeka ile sohbet edin.",
  type: ApplicationCommandType.ChatInput,
  cooldown: 10, // Yapay zeka komutları için 10 saniye bekleme süresi iyi bir başlangıçtır.

  // --- Komutun Seçenekleri (Parametreleri) ---
  options: [
    {
      name: "soru",
      description: "Yapay zekaya yöneltilecek soru.",
      type: ApplicationCommandOptionType.String, // Seçenek türü: Metin
      required: true, // Bu seçeneğin girilmesi zorunludur.
    },
  ],

  // --- Komut Çalıştırıldığında Tetiklenecek Fonksiyon ---
  run: async (client, interaction) => {
    // API'den cevap gelene kadar "düşünüyor..." mesajı göster
    await interaction.deferReply();

    // Kullanıcının girdiği "soru" seçeneğinin değerini al
    const soru = interaction.options.getString("soru");

    try {
      // API'ye POST isteği gönder
      const response = await axios.post(
        "https://free.churchless.tech/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant on Discord.",
            },
            { role: "user", content: soru },
          ],
          max_tokens: 1500, // Cevabın maksimum uzunluğu
        }
      );

      // API'den gelen cevabı ayıkla
      const cevap = response.data.choices[0].message.content.trim();

      // Cevabı şık bir embed içinde göster
      const embed = new EmbedBuilder()
        .setColor(client.config.embedColor || "#2B2D31") // Yapılandırma dosyanızdan renk alır veya varsayılanı kullanır
        .setAuthor({
          name: interaction.user.tag,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTitle("🤔 Soru")
        .setDescription(soru) // Kullanıcının sorusunu gösterir
        .addFields([
          {
            name: "🤖 Yapay Zeka Cevabı",
            // Cevap çok uzunsa Discord'un alan limiti olan 1024 karakteri geçmemesi için kırp
            value: cevap.length > 1024 ? cevap.substring(0, 1021) + "..." : cevap,
          },
        ])
        .setTimestamp()
        .setFooter({
            text: client.config.footer || "Yapay Zeka Sohbet" // Yapılandırma dosyanızdan footer alır veya varsayılanı kullanır
        });
        
      // "Düşünüyor..." mesajını hazırlanan embed ile güncelle
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Yapay zeka API hatası:", error);

      // Hata durumunda kullanıcıyı bilgilendir
      const errorEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Bir Hata Oluştu")
        .setDescription(
          "Yapay zeka servisine bağlanırken bir sorun yaşandı. Lütfen daha sonra tekrar deneyin."
        );
      
      // Hata mesajını gönder
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
