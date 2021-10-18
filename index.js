const { Client, Intents } = require("discord.js");
const config = require("./config");
require("log-timestamp")(() => {
  const now = new Date();
  return `[${now.toUTCString()}]`;
});

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on("ready", () => {
  log("The bot has started!");
});

client.on("messageCreate", async (message) => {
  if (message.channelId !== config.channelId) return;
  if (message.content !== config.emoji) {
    log(`<@${message.author.id}> has sent a bad message :(`);
    await message.delete();
    return;
  }
  const prevMessages = await message.channel.messages.fetch({
    limit: 1,
    before: message.id,
  });
  if (prevMessages.first().author.id === message.author.id) {
    log(`<@${message.author.id}> has doubled up on their spam :(`);
    await message.delete();
    return;
  }
});

client.on("messageDelete", async (message) => {
  //Note: This is useless for messages older than 14 days, due to discord API limitations
  //of delete and edit events not firing for messages older than 14 days.
  if (message.channelId !== config.channelId) return;
  log(
    `A message (${message.id}) from <@${message.author.id}> was deleted in #spam.`
  );
  fixChainIssuesAroundMessage(message);
});

client.on("messageUpdate", (oldMessage, newMessage) => {
  if (message.channelId !== config.channelId) return;

  //Note: This is useless for messages older than 14 days, due to discord API limitations
  //of delete and edit events not firing for messages older than 14 days.
  if (oldMessage.content === newMessage.content) {
    //something else was changed, message wasn't edited.
    return;
  }
  if (newMessage.content === config.emoji) return;
  // a user may be correcting their past mistakes. we shalth allow it.

  log(
    `A message (${newMessage.id}) from <@${newMessage.author}> was edited in #spam.`
  );

  newMessage.delete();
  fixChainIssuesAroundMessage(newMessage);
});

async function fixChainIssuesAroundMessage(message) {
  //TODO implement promise.all for both promises to save time
  const prevMessages = await message.channel.messages.fetch({
    limit: 1,
    before: message.id,
  });
  const nextMessages = await message.channel.messages.fetch({
    limit: 1,
    after: message.id,
  });
  // here we get previous and next messages around a previously disturbed message,
  // and we ensure the chain doesn't get broken by the distrubance
  // by checking if the previous and next messages are of the same author (breaking the chain)
  const prevMessage = prevMessages.first();
  const nextMessage = nextMessages.first();
  if (!prevMessage || !nextMessage) {
    return;
  }
  if (prevMessage.author.id === nextMessage.author.id) {
    await prevMessage.delete();
  }
}

async function log(content) {
  console.log(content);
  const user = await client.users.fetch(config.owner);
  await user.send(content);
}

client.login(config.token);
