import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { createGame, getGame, endGame } from './game/GameManager.js';
import {
  lobbyEmbed, lobbyButtons, roundCardPayload, actionButtons,
  handSelectMenu, resolutionCardPayload,
} from './ui.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`🧭 Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) return handleSlash(interaction);
    if (interaction.isButton()) return handleButton(interaction);
    if (interaction.isStringSelectMenu()) return handleSelect(interaction);
  } catch (err) {
    const msg = err.message || 'صار خطأ غير متوقع.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: `⚠️ ${msg}`, ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: `⚠️ ${msg}`, ephemeral: true }).catch(() => {});
    }
  }
});

async function handleSlash(interaction) {
  if (interaction.commandName === 'table') {
    const game = createGame(interaction.channelId, interaction.user.id);
    game.addPlayer(interaction.user.id, interaction.user.username);
    await interaction.reply({
      embeds: [lobbyEmbed(game)],
      components: lobbyButtons(game.canStart()),
    });
    return;
  }
  if (interaction.commandName === 'table-end') {
    const game = getGame(interaction.channelId);
    if (!game) return interaction.reply({ content: 'ما فيه طاولة نشطة هنا.', ephemeral: true });
    if (game.hostId !== interaction.user.id) {
      return interaction.reply({ content: 'بس المضيف يقدر ينهي الطاولة.', ephemeral: true });
    }
    endGame(interaction.channelId);
    return interaction.reply({ content: '🕯️ الطاولة انطفت.' });
  }
}

async function handleButton(interaction) {
  const game = getGame(interaction.channelId);
  if (!game) return interaction.reply({ content: 'ما فيه طاولة نشطة هنا.', ephemeral: true });

  switch (interaction.customId) {
    case 'lobby_join': {
      game.addPlayer(interaction.user.id, interaction.user.username);
      await interaction.update({ embeds: [lobbyEmbed(game)], components: lobbyButtons(game.canStart()) });
      return;
    }
    case 'lobby_start': {
      if (game.hostId !== interaction.user.id) {
        return interaction.reply({ content: 'بس اللي فتح الطاولة يقدر يبدأها.', ephemeral: true });
      }
      game.start();
      const payload = roundCardPayload(game);
      await interaction.update({ embeds: payload.embeds, files: payload.files, components: actionButtons(game) });
      return;
    }
    case 'act_play': {
      if (game.currentPlayerId() !== interaction.user.id) {
        return interaction.reply({ content: 'مو دورك الحين.', ephemeral: true });
      }
      const hand = game.getHand(interaction.user.id);
      await interaction.reply({
        content: `يدك السرية (${hand.length} بطاقات) — اختر وش تلعب وتدّعي إنه من نوع مستهدف الجولة:`,
        components: handSelectMenu(interaction.user.id, hand),
        ephemeral: true,
      });
      return;
    }
    case 'act_believe': {
      if (game.currentPlayerId() !== interaction.user.id) {
        return interaction.reply({ content: 'مو دورك الحين.', ephemeral: true });
      }
      game.believe(interaction.user.id);
      if (game.status === 'FINISHED') {
        await interaction.update({ content: '🕯️ انتهت اللعبة.', embeds: [], components: [] });
        endGame(interaction.channelId);
        return;
      }
      const payload = roundCardPayload(game);
      await interaction.update({ embeds: payload.embeds, files: payload.files, components: actionButtons(game) });
      return;
    }
    case 'act_doubt': {
      if (game.currentPlayerId() !== interaction.user.id) {
        return interaction.reply({ content: 'مو دورك الحين.', ephemeral: true });
      }
      const result = game.callBluff(interaction.user.id);
      const resPayload = resolutionCardPayload(game, result);
      await interaction.update({ embeds: resPayload.embeds, files: resPayload.files, components: [] });
      if (result.gameOver) {
        endGame(interaction.channelId);
        return;
      }
      const nextPayload = roundCardPayload(game);
      await interaction.followUp({ embeds: nextPayload.embeds, files: nextPayload.files, components: actionButtons(game) });
      return;
    }
  }
}

async function handleSelect(interaction) {
  const game = getGame(interaction.channelId);
  if (!game) return interaction.reply({ content: 'ما فيه طاولة نشطة هنا.', ephemeral: true });
  if (!interaction.customId.startsWith('hand_select_')) return;

  const ownerId = interaction.customId.replace('hand_select_', '');
  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: 'هذي مو يدك.', ephemeral: true });
  }

  const { count } = game.playCards(interaction.user.id, interaction.values);
  await interaction.update({
    content: `✅ لعبت ${count} بطاقة وادّعيت إنها من نوع الجولة. رجع للروم العام.`,
    components: [],
  });

  const channel = await client.channels.fetch(interaction.channelId);
  const payload = roundCardPayload(game);
  await channel.send({ embeds: payload.embeds, files: payload.files, components: actionButtons(game) });
}

client.login(process.env.DISCORD_TOKEN);
