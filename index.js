const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
} = require("discord.js");

const CONFIG = {
  TOKEN: TOKEN: process.env.TOKEN,
  AUTO_ROLE_ID: "1520644536647286956",
  EMBED_COLOR: 0x9b59b6,
};
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const awaitingInput = new Map();

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ─── AUTO ROLE ON JOIN ─────────────────────────────────────────────────────────
client.on("guildMemberAdd", async (member) => {
  try {
    const role = member.guild.roles.cache.get(CONFIG.AUTO_ROLE_ID);
    if (!role) return console.log("❌ Auto role not found!");
    await member.roles.add(role);
    console.log(`✅ Gave role to ${member.user.tag}`);
  } catch (error) {
    console.error("Error giving auto role:", error);
  }
});

// ─── EMBED CREATOR ─────────────────────────────────────────────────────────────
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!type") {
    if (!message.member.permissions.has("ManageMessages")) {
      return message.reply("❌ You don't have permission to use this command.");
    }

    awaitingInput.set(message.author.id, {
      channelId: message.channel.id,
      step: "title",
    });

    await message.reply(
      "📝 **Embed Creator**\n\nWhat should the **title** of the embed be?\n*(Type `skip` to leave it blank)*"
    );
    return;
  }

  if (awaitingInput.has(message.author.id)) {
    const session = awaitingInput.get(message.author.id);
    if (message.channel.id !== session.channelId) return;

    if (session.step === "title") {
      session.title = message.content === "skip" ? null : message.content;
      session.step = "description";
      awaitingInput.set(message.author.id, session);
      await message.reply(
        "✏️ Now type the **description** (main text) of your embed:\n*(You can use Discord markdown like **bold**, *italic*, etc)*"
      );
      return;
    }

    if (session.step === "description") {
      session.description = message.content;
      session.step = "color";
      awaitingInput.set(message.author.id, session);
      await message.reply(
        "🎨 What **color** do you want the embed?\n\nType one of: `purple`, `blue`, `red`, `green`, `yellow`, `pink`, `white`\n*(Or type `skip` for default purple)*"
      );
      return;
    }

    if (session.step === "color") {
      const colors = {
        purple: 0x9b59b6,
        blue: 0x3498db,
        red: 0xe74c3c,
        green: 0x2ecc71,
        yellow: 0xf1c40f,
        pink: 0xff69b4,
        white: 0xffffff,
        skip: 0x9b59b6,
      };
      session.color = colors[message.content.toLowerCase()] || 0x9b59b6;
      session.step = "footer";
      awaitingInput.set(message.author.id, session);
      await message.reply(
        "📌 Do you want a **footer** text?\n*(Type your footer text or `skip` to leave it blank)*"
      );
      return;
    }

    if (session.step === "footer") {
      session.footer = message.content === "skip" ? null : message.content;

      const embed = new EmbedBuilder().setColor(session.color);
      if (session.title) embed.setTitle(session.title);
      if (session.description) embed.setDescription(session.description);
      if (session.footer) embed.setFooter({ text: session.footer });
      embed.setTimestamp();

      await message.channel.send({ embeds: [embed] });
      await message.reply("✅ Embed sent!");
      awaitingInput.delete(message.author.id);
      return;
    }
  }

  if (message.content === "!cancel" && awaitingInput.has(message.author.id)) {
    awaitingInput.delete(message.author.id);
    await message.reply("❌ Embed creation cancelled.");
  }
});

client.login(CONFIG.TOKEN);