import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, AttachmentBuilder,
} from 'discord.js';
import { RANK_LABEL, cardGlyph } from './game/deck.js';
import { renderRoundCard } from './render/tableCard.js';

// palette pulled straight from the "Ashfall Table" UI theme
export const COLOR_FOG = 0x5a5e66;
export const COLOR_EMBER = 0xc4472f;
export const COLOR_SIGNAL = 0x8a9a8c;

export function lobbyEmbed(game) {
  const names = game.joinOrder.map((id, i) => `${i + 1}. ${game.players.get(id).name}`).join('\n')
    || 'ما فيه ناجين لسا…';
  return new EmbedBuilder()
    .setColor(COLOR_FOG)
    .setTitle('🧭 طاولة الأيس — ASHFALL TABLE')
    .setDescription('طاولة كذب وبلاف. كل لاعب يدّعي، والبقية يقررون: يصدّقون ولا يكذّبون.\nمن يُكشف كذبه أو يخطئ بالتكذيب، يسحب من مسدسه.')
    .addFields(
      { name: 'الناجون على الطاولة', value: names },
      { name: 'الحد الأدنى/الأقصى', value: '٢ – ٤ لاعبين' },
    )
    .setFooter({ text: 'اضغط "انضم" عشان تدخل الطاولة' });
}

export function lobbyButtons(canStart) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lobby_join').setLabel('انضم للطاولة').setEmoji('🪶').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('lobby_start').setLabel('ابدأ اللعبة').setEmoji('🔥').setStyle(ButtonStyle.Danger).setDisabled(!canStart),
  );
  return [row];
}

// Builds the embed + rendered PNG attachment for the current turn.
// mode is inferred from game.pendingPlay: 'claim' if there's a pending
// claim to resolve, otherwise plain 'round'.
export function roundCardPayload(game) {
  const currentId = game.currentPlayerId();
  const current = game.players.get(currentId);
  const mode = game.pendingPlay ? 'claim' : 'round';
  const buffer = renderRoundCard(game, mode);
  const attachment = new AttachmentBuilder(buffer, { name: 'round.png' });

  const e = new EmbedBuilder()
    .setColor(game.pendingPlay ? COLOR_EMBER : COLOR_FOG)
    .setTitle(`🌫️ الجولة ${game.round} — النار على ${RANK_LABEL[game.target]}`)
    .setImage('attachment://round.png');

  e.setDescription(
    game.pendingPlay
      ? `دور **${current.name}**: يصدّق ولا يكذّب؟`
      : `دور **${current.name}**: اختر بطاقاتك وادّعِ إنها **${RANK_LABEL[game.target]}**.`,
  );

  return { embeds: [e], files: [attachment] };
}

export function actionButtons(game) {
  const rows = [];
  if (game.pendingPlay) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_believe').setLabel('تصديق').setEmoji('🃏').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_doubt').setLabel('تكذيب').setEmoji('🔍').setStyle(ButtonStyle.Danger),
    ));
  } else {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_play').setLabel('العب بطاقات').setEmoji('🪦').setStyle(ButtonStyle.Primary),
    ));
  }
  return rows;
}

export function handSelectMenu(playerId, hand) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`hand_select_${playerId}`)
    .setPlaceholder('اختر من ١ إلى ٣ بطاقات تلعبها')
    .setMinValues(1)
    .setMaxValues(Math.min(3, hand.length))
    .addOptions(hand.map((c) => ({
      label: `${cardGlyph(c)} — ${RANK_LABEL[c.rank]}`,
      value: c.id,
    })));
  return [new ActionRowBuilder().addComponents(menu)];
}

// Builds the embed + rendered PNG attachment revealing the resolved claim.
// `game` should still reflect the *previous* round's players/target when
// this is called (i.e. call before or alongside starting the next round —
// index.js passes a lightweight snapshot for this reason, see below).
export function resolutionCardPayload(game, result) {
  const snap = result.snapshot;
  const loser = snap.players.get(result.loserId);
  // shim exposing just what renderRoundCard needs, frozen at the moment
  // right after the spin (before the next round's redeal happens)
  const view = {
    round: snap.round,
    target: snap.target,
    joinOrder: snap.joinOrder,
    players: snap.players,
    pendingPlay: null,
    activePlayers: () => snap.joinOrder.map((id) => snap.players.get(id)).filter((p) => !p.eliminated),
    currentPlayerId: () => result.loserId,
  };
  const buffer = renderRoundCard(view, 'reveal', result.cards);
  const attachment = new AttachmentBuilder(buffer, { name: 'reveal.png' });

  const e = new EmbedBuilder()
    .setColor(result.eliminated ? COLOR_EMBER : COLOR_SIGNAL)
    .setTitle(result.truth ? '✅ الادّعاء كان صادق' : '🔥 الادّعاء كان كذب')
    .setDescription(`**${loser.name}** يسحب من مسدسه…`)
    .setImage('attachment://reveal.png')
    .addFields({
      name: result.eliminated ? '💀 الطلقة أصابت' : '😮‍💨 نجا',
      value: result.eliminated
        ? `**${loser.name}** طاح من الطاولة.`
        : `**${loser.name}** نجا — الغرفة رقم ${result.chamber}/6.`,
    });

  if (result.gameOver) {
    const winner = result.winnerId ? game.players.get(result.winnerId) : null;
    e.setColor(COLOR_EMBER);
    e.addFields({ name: '🏆 نهاية اللعبة', value: winner ? `**${winner.name}** هو الناجي الأخير.` : 'انتهت اللعبة.' });
  }

  return { embeds: [e], files: [attachment] };
}
