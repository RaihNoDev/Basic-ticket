const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonStyle, ChannelType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");

// Verifica se o arquivo ticket.json existe, se não, cria o arquivo com conteúdo inicial
if (!fs.existsSync("./ticket.json")) {
  fs.writeFileSync("./ticket.json", JSON.stringify([]));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });
client.commands = new Collection();

const commandFiles = fs.readdirSync(path.join(__dirname, "commands")).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once("ready", async () => {
  console.log("🎉 Bot is online!");

  const commands = client.commands.map(command => command.data.toJSON());

  try {
    console.log("🔄 Started refreshing application (/) commands.");

    await client.application.commands.set(commands);

    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async interaction => {
  const tickets = JSON.parse(fs.readFileSync("./ticket.json", "utf-8"));

  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "❌ Ocorreu um erro ao executar este comando.", flags: 64 });
    }
  } else if (interaction.isButton()) {
    if (interaction.customId === "startSupport") {
      const modal = new ModalBuilder()
        .setCustomId("supportModal")
        .setTitle("Suporte")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("ticketReason")
              .setLabel("Qual o motivo do ticket?")
              .setStyle(TextInputStyle.Paragraph)
          )
        );

      await interaction.showModal(modal);
    } else if (interaction.customId === "assumeTicket") {
      const channel = interaction.channel;
      const ticket = tickets.find(t => t.channelId === channel.id);
      ticket.assumedBy = interaction.user.username;
      ticket.status = "assumido";

      fs.writeFileSync("./ticket.json", JSON.stringify(tickets, null, 2));

      const updatedEmbed = EmbedBuilder.from(channel.lastMessage.embeds[0])
        .spliceFields(0, 1, { name: "Assumido Por:", value: interaction.user.username });

      await interaction.update({ embeds: [updatedEmbed] });
    } else if (interaction.customId === "closeTicket") {
      const channel = interaction.channel;
      const ticket = tickets.find(t => t.channelId === channel.id);
      ticket.closedBy = interaction.user.username;
      ticket.status = "fechado";

      fs.writeFileSync("./ticket.json", JSON.stringify(tickets, null, 2));

      await channel.delete();
    }
  } else if (interaction.isModalSubmit()) {
    if (interaction.customId === "supportModal") {
      const ticketReason = interaction.fields.getTextInputValue("ticketReason");
      const channelName = `ticket-${interaction.user.username}`;
      const guild = interaction.guild;
      const { ownerID, staffRoleID } = require("./config.json");
      const role = guild.roles.cache.get(staffRoleID);

      if (tickets.some(ticket => ticket.userId === interaction.user.id && ticket.status === "aberto")) {
        return interaction.reply({ content: "❗ Você já tem um ticket aberto.", flags: 64 });
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: ownerID,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      tickets.push({
        userId: interaction.user.id,
        userName: interaction.user.username,
        channelId: channel.id,
        reason: ticketReason,
        status: "aberto",
        assumedBy: null,
        closedBy: null,
      });

      fs.writeFileSync("./ticket.json", JSON.stringify(tickets, null, 2));

      const ticketEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("🎫 Novo Ticket")
        .setDescription(`👤 Quem abriu: ${interaction.user.tag} (${interaction.user.id})`)
        .addFields(
          { name: "Assumido Por:", value: "Ninguém ainda" },
          { name: "Motivo da abertura:", value: ticketReason },
          { name: "Horário da abertura:", value: new Date().toLocaleString() }
        );

      const ticketButtons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId("assumeTicket")
            .setLabel("📝 Assumir Ticket")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("closeTicket")
            .setLabel("🔒 Fechar Ticket")
            .setStyle(ButtonStyle.Danger)
        );

      await channel.send({ embeds: [ticketEmbed], components: [ticketButtons] });
    }
  }
});

client.login(config.token);
