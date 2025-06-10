import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import fs from "fs";
import config from "./config.json" assert { type: "json" };
import { loadEvents } from "./function/eventLoader.js";
import { loadCommands } from "./function/commandLoader.js";

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

client.login(config.token);
