import { createCanvas } from '@napi-rs/canvas';
import { THEME, SLOTS, SURVIVOR_ICONS } from './theme.js';
import { RANK_LABEL, cardGlyph } from '../game/deck.js';

const W = 860;
const H = 820;
const RADIUS = 28;

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackdrop(ctx) {
  // base ash gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#34363a');
  grad.addColorStop(0.4, '#202124');
  grad.addColorStop(1, '#17181a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // soft top glow
  const glow = ctx.createRadialGradient(W / 2, H * 0.05, 10, W / 2, H * 0.1, W * 0.6);
  glow.addColorStop(0, 'rgba(157,160,164,0.18)');
  glow.addColorStop(1, 'rgba(157,160,164,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // fog bands
  ctx.save();
  const bands = [
    { y: H * 0.08, h: 110, alpha: 0.10 },
    { y: H * 0.34, h: 80, alpha: 0.07 },
    { y: H * 0.82, h: 100, alpha: 0.09 },
  ];
  for (const b of bands) {
    const bg = ctx.createLinearGradient(0, b.y, W, b.y);
    bg.addColorStop(0, 'rgba(220,220,222,0)');
    bg.addColorStop(0.5, `rgba(220,220,222,${b.alpha})`);
    bg.addColorStop(1, 'rgba(220,220,222,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, b.y, W, b.h);
  }
  ctx.restore();

  // distant wreck silhouettes
  ctx.fillStyle = 'rgba(15,16,18,0.6)';
  ctx.beginPath();
  ctx.moveTo(20, H); ctx.lineTo(45, H * 0.75); ctx.lineTo(80, H * 0.68);
  ctx.lineTo(95, H * 0.78); ctx.lineTo(130, H * 0.72); ctx.lineTo(140, H); ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(W - 20, H); ctx.lineTo(W - 40, H * 0.62); ctx.lineTo(W - 70, H * 0.66);
  ctx.lineTo(W - 90, H * 0.5); ctx.lineTo(W - 115, H * 0.58); ctx.lineTo(W - 140, H * 0.4);
  ctx.lineTo(W - 165, H * 0.55); ctx.lineTo(W - 190, H); ctx.closePath();
  ctx.fill();

  // sparse grain
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 250; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillRect(x, y, 1, 1);
  }

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

function drawWordmark(ctx, round, target) {
  const x = 46, y = 42, box = 52;
  roundedRectPath(ctx, x, y, box, box, 10);
  const g = ctx.createLinearGradient(x, y, x + box, y + box);
  g.addColorStop(0, '#3a3c40'); g.addColorStop(1, '#1c1d1f');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(215,213,205,0.25)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = THEME.bone;
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🧭', x + box / 2, y + box / 2 + 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = THEME.bone;
  ctx.font = '600 20px Georgia, serif';
  ctx.fillText('ASHFALL TABLE', x + box + 12, y + 22);
  ctx.fillStyle = THEME.fog;
  ctx.font = '10px monospace';
  ctx.fillText(`ROUND ${round} · TARGET ${RANK_LABEL[target] ?? '—'}`, x + box + 12, y + 40);
}

function drawClaimPlate(ctx, claimantName, count, rankLabel) {
  const x = 46, y = 42, w = 300, h = 78;
  roundedRectPath(ctx, x, y, w, h, 10);
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#3a3c40'); g.addColorStop(1, '#1c1d1f');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(215,213,205,0.25)'; ctx.lineWidth = 1; ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = THEME.fog;
  ctx.font = '11px monospace';
  ctx.fillText(claimantName, x + 16, y + 22);
  ctx.fillStyle = THEME.bone;
  ctx.font = '600 22px Georgia, serif';
  ctx.fillText(`يدّعي ${count}× ${rankLabel}`, x + 16, y + 54);
}

function drawTable(ctx, mode, cards) {
  const cx = W / 2, cy = H / 2, r = 190;
  const g = ctx.createRadialGradient(cx - 40, cy - 50, 10, cx, cy, r);
  g.addColorStop(0, 'rgba(120,122,126,0.28)');
  g.addColorStop(0.55, '#232427');
  g.addColorStop(1, '#17181a');
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = 'rgba(215,213,205,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.beginPath(); ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(215,213,205,0.22)'; ctx.setLineDash([4, 6]); ctx.stroke();
  ctx.setLineDash([]);

  // compass needle
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy - r + 22);
  ctx.lineTo(cx + 9, cy - r + 22);
  ctx.lineTo(cx, cy - r + 40);
  ctx.closePath();
  ctx.fillStyle = THEME.emberLine;
  ctx.fill();

  // cards in center (face-down for a pending claim, face-up for a reveal)
  if (cards && cards.length) {
    const cw = 54, ch = 76, gap = 26;
    const totalW = cw + (cards.length - 1) * gap;
    let startX = cx - totalW / 2;
    for (let i = 0; i < cards.length; i++) {
      const x = startX + i * gap;
      const y = cy - ch / 2;
      roundedRectPath(ctx, x, y, cw, ch, 6);
      if (mode === 'reveal') {
        const cg = ctx.createLinearGradient(x, y, x + cw, y + ch);
        cg.addColorStop(0, THEME.cardFace); cg.addColorStop(1, THEME.cardFaceDark);
        ctx.fillStyle = cg; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
        ctx.fillStyle = '#232323';
        ctx.font = '600 26px Georgia, serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(cardGlyph(cards[i]), x + cw / 2, y + ch / 2 + 2);
      } else {
        ctx.fillStyle = THEME.cardBack; ctx.fill();
        ctx.strokeStyle = THEME.cardBackBorder; ctx.stroke();
      }
    }
  }
}

function drawPlayer(ctx, slot, name, handCount, chambersLeft, icon, isActive) {
  const cx = W / 2, cy = H / 2;
  const positions = {
    top: { x: cx, y: 118, av: 'above' },
    bottom: { x: cx, y: H - 118, av: 'below' },
    right: { x: W - 96, y: cy, av: 'side' },
    left: { x: 96, y: cy, av: 'side' },
  };
  const pos = positions[slot];
  const avR = 34;

  // avatar circle
  ctx.beginPath(); ctx.arc(pos.x, pos.y, avR, 0, Math.PI * 2);
  const ag = ctx.createLinearGradient(pos.x - avR, pos.y - avR, pos.x + avR, pos.y + avR);
  ag.addColorStop(0, '#4a4c50'); ag.addColorStop(1, '#232427');
  ctx.fillStyle = ag; ctx.fill();
  ctx.lineWidth = isActive ? 3 : 2;
  ctx.strokeStyle = isActive ? '#e7e5dd' : 'rgba(215,213,205,0.4)';
  ctx.stroke();

  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = THEME.bone;
  ctx.fillText(icon, pos.x, pos.y + 2);

  // name tag + badges, placed relative to avatar depending on slot
  const tagY = pos.av === 'above' ? pos.y + avR + 14
    : pos.av === 'below' ? pos.y - avR - 46
      : pos.y - 10;
  const tagX = slot === 'left' ? pos.x + avR + 14
    : slot === 'right' ? pos.x - avR - 150
      : pos.x - 60;
  const tagW = 120, tagH = 24;

  roundedRectPath(ctx, tagX, tagY, tagW, tagH, 5);
  ctx.fillStyle = 'rgba(20,21,23,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(215,213,205,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = THEME.bone;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, tagX + tagW / 2, tagY + tagH / 2 + 1);

  const badgeY = tagY + tagH + 8;
  const badgeX = tagX + tagW / 2 - 30;
  roundedRectPath(ctx, badgeX, badgeY, 26, 26, 4);
  const bg2 = ctx.createLinearGradient(badgeX, badgeY, badgeX + 26, badgeY + 26);
  bg2.addColorStop(0, THEME.cardFace); bg2.addColorStop(1, THEME.cardFaceDark);
  ctx.fillStyle = bg2; ctx.fill();
  ctx.fillStyle = '#232323';
  ctx.font = '600 14px Georgia, serif';
  ctx.fillText(String(handCount), badgeX + 13, badgeY + 14);

  const tokenX = badgeX + 34;
  ctx.beginPath(); ctx.arc(tokenX + 13, badgeY + 13, 13, 0, Math.PI * 2);
  const tg = ctx.createRadialGradient(tokenX + 8, badgeY + 8, 2, tokenX + 13, badgeY + 13, 13);
  tg.addColorStop(0, '#8f9296'); tg.addColorStop(1, '#45474b');
  ctx.fillStyle = tg; ctx.fill();
  ctx.fillStyle = THEME.bone;
  ctx.font = '10px monospace';
  ctx.fillText(`${chambersLeft}`, tokenX + 13, badgeY + 14);
}

function drawFooter(ctx, text) {
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(215,213,205,0.35)';
  ctx.font = '9px monospace';
  ctx.fillText(text.toUpperCase(), W / 2, H - 20);
}

/**
 * Renders the round card as a PNG buffer.
 * mode: 'round'  — normal turn, no cards shown at center
 *       'claim'  — pending play, cards shown face-down + claim plate
 *       'reveal' — resolved challenge, cards shown face-up
 */
export function renderRoundCard(game, mode = 'round', revealCards = null) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  roundedRectPath(ctx, 0, 0, W, H, RADIUS);
  ctx.save();
  ctx.clip();

  drawBackdrop(ctx);

  const active = game.activePlayers();
  active.forEach((p, i) => {
    const slot = SLOTS[i % SLOTS.length];
    const iconIdx = game.joinOrder.indexOf(p.id) % SURVIVOR_ICONS.length;
    const isActive = game.currentPlayerId() === p.id;
    drawPlayer(ctx, slot, p.name, p.hand.length, 6 - p.cylinder, SURVIVOR_ICONS[iconIdx], isActive);
  });

  if (mode === 'claim' && game.pendingPlay) {
    const claimant = game.players.get(game.pendingPlay.playerId);
    drawClaimPlate(ctx, claimant.name, game.pendingPlay.cards.length, RANK_LABEL[game.target]);
    drawTable(ctx, 'claim', game.pendingPlay.cards);
  } else if (mode === 'reveal' && revealCards) {
    drawWordmark(ctx, game.round, game.target);
    drawTable(ctx, 'reveal', revealCards);
  } else {
    drawWordmark(ctx, game.round, game.target);
    drawTable(ctx, 'round', null);
  }

  drawFooter(ctx, 'Trust No One');
  ctx.restore();

  return canvas.toBuffer('image/png');
}
