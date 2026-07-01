const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const CONFIG = {
TOKEN: process.env.TOKEN,
  GUILD_ID: "1520242100426506250",
  SUPPORT_PANEL_CHANNEL: "1520245777350525028",
  TICKET_CATEGORY: "1520642466611466240",
  STAFF_ROLE_ID: "1520248061467689070",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const TICKET_CATEGORIES = [
  { value: "make_a_purchase", label: "Make a Purchase", description: "Buy products & complete your order", emoji: "🛒" },
  { value: "tweak_issue", label: "Tweak Issue", description: "Problems or disputes with your tweak order", emoji: "🔧" },
  { value: "report_member", label: "Report Member", description: "Report misconduct or rule violations", emoji: "🚨" },
  { value: "general_support", label: "General Support", description: "All other enquiries & questions", emoji: "💬" },
];

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📋 Type !sendpanel in your panel channel to post the support embed.`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!sendpanel") return;
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply("❌ You need Administrator permission to use this.");
  }
  await message.delete().catch(() => {});
  await sendSupportPanel(message.channel);
});

async function sendSupportPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle("Law Tweaks — Support")
    .setDescription("Welcome. If you require assistance, please select the appropriate category below to open a private support ticket.\n\nA member of our team will be with you shortly.")
    .addFields(
      { name: "🛒 Make a Purchase", value: "Buy products & complete your order", inline: true },
      { name: "🔧 Tweak Issue", value: "Problems or disputes with your order", inline: true },
      { name: "🚨 Report Member", value: "Report misconduct or rule violations", inline: true },
      { name: "💬 General Support", value: "All other enquiries & questions", inline: true }
    )
    .setFooter({ text: "Aphrodite Services • Support System" })
    .setColor(0x9b59b6)
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("ticket_category_select")
    .setPlaceholder("Select a support category...")
    .addOptions(TICKET_CATEGORIES.map((cat) => ({
      label: cat.label,
      description: cat.description,
      value: cat.value,
      emoji: cat.emoji,
    })));

  const row = new ActionRowBuilder().addComponents(selectMenu);
  await channel.send({ embeds: [embed], components: [row] });
}

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket_category_select") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const selected = TICKET_CATEGORIES.find((c) => c.value === interaction.values[0]);
      const guild = interaction.guild;
      const member = interaction.member;

      const existingChannel = guild.channels.cache.find(
(ch) => ch.name.startsWith(`ticket-`) && ch.parentId === CONFIG.TICKET_CATEGORY && ch.members?.has(member.id)
      );

      if (existingChannel) {
        return interaction.editReply({ content: `❌ You already have an open ticket for **${selected.label}**: ${existingChannel}` });
      }

      const ticketChannel = await guild.channels.create({
name: `ticket-${Math.floor(Math.random() * 9000) + 1000}`,
        type: ChannelType.GuildText,
        parent: CONFIG.TICKET_CATEGORY,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: member.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
          },
          {
            id: CONFIG.STAFF_ROLE_ID,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ManageMessages],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`${selected.emoji} ${selected.label}`)
        .setDescription(`Hello ${member}, thank you for opening a ticket.\n\n**Category:** ${selected.label}\n**Description:** ${selected.description}\n\nA member of our team will be with you shortly. Please describe your issue below.`)
        .setColor(0x9b59b6)
        .setFooter({ text: "Aphrodite Services • Support System" })
        .setTimestamp();

      const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketChannel.id}`)
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);

      const claimButton = new ButtonBuilder()
        .setCustomId(`claim_ticket_${ticketChannel.id}`)
        .setLabel("Claim Ticket")
        .setEmoji("✋")
        .setStyle(ButtonStyle.Success);

      const buttonRow = new ActionRowBuilder().addComponents(claimButton, closeButton);

      await ticketChannel.send({
        content: `${member} | <@&${CONFIG.STAFF_ROLE_ID}>`,
        embeds: [ticketEmbed],
        components: [buttonRow],
      });

      await interaction.editReply({ content: `✅ Your ticket has been created: ${ticketChannel}` });
    }

    if (interaction.isButton() && interaction.customId.startsWith("close_ticket_")) {
      await interaction.deferReply();
      const closeEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Closing")
        .setDescription(`This ticket will be deleted in **5 seconds**.\nClosed by: ${interaction.member}`)
        .setColor(0xe74c3c)
        .setTimestamp();
      await interaction.editReply({ embeds: [closeEmbed] });
      setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
    }

    if (interaction.isButton() && interaction.customId.startsWith("claim_ticket_")) {
      await interaction.reply({ content: `✅ This ticket has been claimed by ${interaction.member}!` });
      const disabledClaim = new ButtonBuilder()
        .setCustomId(`claimed_${interaction.customId}`)
        .setLabel(`Claimed by ${interaction.member.displayName}`)
        .setEmoji("✅")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true);
      const closeButton = new ButtonBuilder()
        .setCustomId(interaction.customId.replace("claim_", "close_"))
        .setLabel("Close Ticket")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger);
      const newRow = new ActionRowBuilder().addComponents(disabledClaim, closeButton);
      await interaction.message.edit({ components: [newRow] });
    }
  } catch (error) {
    console.error("Interaction error:", error);
  }
});

client.login(CONFIG.TOKEN);
