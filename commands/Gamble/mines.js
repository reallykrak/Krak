const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = {
  name: "mines",
  description: "💣 Mines oyununu başlat (Coming Soon...)",
  type: 1,
  options: [],
  
  run: async (client, interaction) => {
    const byteCoinEmoji = "<:emoji_28:1382326426392330251>";
    const infoEmoji = "<:emoji_11:1381662771762036797>";

    const embed = new EmbedBuilder()
      .setTitle("💎 MINES")
      .setDescription(`
🔹 In the mines game, there is a 5x4 table with 💣 bombs and 💎 diamonds.
🔹 Each click can bring fortune or total loss.
🔹 Be brave, be smart, and cash out in time!

${infoEmoji} **How to Play**
🔸 Click "Play", set your bet & bombs, then start revealing diamonds!
🔸 Cash out before hitting a 💣 to secure your ${byteCoinEmoji}!

\`PixelLuck best of all 💫\`
      `)
      .setColor("#FFD700") // altın sarısı
      .setFooter({ text: "Coming Soon..." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mines_play")
        .setLabel("🎮 Play")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("mines_balance")
        .setLabel(`${byteCoinEmoji} Balance`)
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
