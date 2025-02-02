const { SlashCommandBuilder } = require("discord.js");
const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require("discord.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Cria um ticket de suporte"),
  async execute(interaction) {
    const { ownerID, staffRoleID } = require("../config.json");
    const tickets = JSON.parse(fs.readFileSync("./ticket.json", "utf-8"));

    console.log(`Owner ID from config: ${ownerID}`);
    console.log(`User ID: ${interaction.user.id}`);

    if (interaction.user.id !== ownerID) {
      return interaction.reply({ content: "Somente o owner pode usar este comando.", flags: 64 });
    }

    if (tickets.some(ticket => ticket.userId === interaction.user.id && ticket.status === "aberto")) {
      return interaction.reply({ content: "Você já tem um ticket aberto.", flags: 64 });
    }

    await interaction.reply({ content: "🎫 Enviando painel de ticket...", flags: 64 });

    const ticketEmbed = new EmbedBuilder()
      .setColor("#0099ff")
      .setTitle("🎫 Central de Atendimento")
      .setDescription("👋 Olá! Bem-vindo(a) ao sistema de tickets Vanguard\n\nPara abrir um ticket, clique no botão abaixo e nos informe o motivo do seu contato. Estamos aqui para ajudar! 🧑‍💻\n\n🔒 Após enviar o motivo, será gerado um canal de texto privado para que possamos ajudá-lo de forma segura e ágil.\n\n✨ Estamos aqui para ajudar!");

    const ticketButtons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("startSupport")
          .setLabel("🎟 Iniciar Atendimento")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("staffPanel")
          .setLabel("👥 Staff")
          .setStyle(ButtonStyle.Secondary)
      );

    await interaction.channel.send({ embeds: [ticketEmbed], components: [ticketButtons] });
  },
};
