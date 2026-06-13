/* =====================================================================
   canvas.js — Graphic Generation and Theme Exporter
   ===================================================================== */

/* ── Graphic Generator Background Blocks ────────────────────────────── */
function drawCloudsBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#7597d4'); g.addColorStop(0.6,'#b1c5e5'); g.addColorStop(1,'#f5e2d6');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  function cloud(cx,cy,s){
    ctx.beginPath();
    ctx.arc(cx,cy,30*s,0,Math.PI*2); ctx.arc(cx+25*s,cy-10*s,42*s,0,Math.PI*2);
    ctx.arc(cx+62*s,cy,32*s,0,Math.PI*2); ctx.arc(cx+31*s,cy+15*s,31*s,0,Math.PI*2);
    ctx.closePath(); ctx.fill();
  }
  cloud(W*0.2,H*0.25,W/600); cloud(W*0.75,H*0.16,W/500);
  cloud(W*0.85,H*0.76,W/550); cloud(W*0.15,H*0.82,W/600);
}

function drawMountainsBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#2b1a3d'); g.addColorStop(0.5,'#5c3a56');
  g.addColorStop(0.8,'#c9646c'); g.addColorStop(1,'#fec389');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(254,210,150,0.55)';
  ctx.beginPath(); ctx.arc(W*0.5,H*0.65,W*0.14,0,Math.PI*2); ctx.fill();
  drawMountainRidge(ctx,W,H,0.62,'rgba(92,58,86,0.5)',40,100);
  drawMountainRidge(ctx,W,H,0.76,'rgba(43,26,61,0.75)',65,200);
  drawMountainRidge(ctx,W,H,0.91,'rgba(18,10,31,0.96)',80,300);
}

function drawMountainRidge(ctx, W, H, sy, color, rough, seed) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0,H);
  var pts = 16, step = W/(pts-1);
  function prng(x){var s=Math.sin(x)*10000;return s-Math.floor(s);}
  for (var i=0;i<pts;i++) ctx.lineTo(i*step, H*sy + prng(seed+i)*rough - rough/2);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
}

function drawOceanBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#040d1a'); g.addColorStop(0.6,'#082545'); g.addColorStop(1,'#134e6f');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  var glow = ctx.createRadialGradient(W*0.5,H*0.4,10,W*0.5,H*0.4,W*0.5);
  glow.addColorStop(0,'rgba(255,255,255,0.12)'); glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  drawWave(ctx,W,H,0.74,'rgba(19,78,111,0.3)',20,0.007,0);
  drawWave(ctx,W,H,0.81,'rgba(12,55,84,0.53)',24,0.009,120);
  drawWave(ctx,W,H,0.89,'rgba(5,25,45,0.88)',16,0.013,240);
}

function drawWave(ctx, W, H, sy, color, amp, freq, phase) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0,H);
  for (var x=0;x<=W;x+=10) ctx.lineTo(x, H*sy + Math.sin(x*freq+phase)*amp);
  ctx.lineTo(W,H); ctx.closePath(); ctx.fill();
}

function drawForestBg(ctx, W, H) {
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#051108'); g.addColorStop(0.7,'#112a18'); g.addColorStop(1,'#1e462b');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  [14,47,72,29,53,81,38,62,95,107].forEach(function(s){
    ctx.beginPath(); ctx.arc(((s*17)%100)/100*W, ((s*33)%100)/100*H*0.48, 1.4, 0, Math.PI*2); ctx.fill();
  });
  drawForestRow(ctx,W,H,0.86,'rgba(10,28,15,0.65)',W*0.06,W*0.13,555);
  drawForestRow(ctx,W,H,0.91,'rgba(4,15,8,0.92)',W*0.08,W*0.17,777);
}

function drawForestRow(ctx, W, H, sy, color, tW, tH, seed) {
  ctx.fillStyle = color;
  function prng(x){var s=Math.sin(x)*10000;return s-Math.floor(s);}
  for (var x=-tW;x<W+tW;x+=tW*0.65){
    var rs=0.72+prng(seed+x)*0.58, h=tH*rs, w=tW*rs;
    drawPineTree(ctx, x+w/2, H*sy+prng(seed+x+2)*(H*0.05), w, h);
  }
}

function drawPineTree(ctx, cx, base, w, h) {
  ctx.beginPath();
  ctx.moveTo(cx,base-h);
  ctx.lineTo(cx-w*0.25,base-h*0.7); ctx.lineTo(cx-w*0.15,base-h*0.7);
  ctx.lineTo(cx-w*0.4,base-h*0.4);  ctx.lineTo(cx-w*0.25,base-h*0.4);
  ctx.lineTo(cx-w*0.5,base);         ctx.lineTo(cx+w*0.5,base);
  ctx.lineTo(cx+w*0.25,base-h*0.4); ctx.lineTo(cx+w*0.4,base-h*0.4);
  ctx.lineTo(cx+w*0.15,base-h*0.7); ctx.lineTo(cx+w*0.25,base-h*0.7);
  ctx.closePath(); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

/* ── Typography and Canvas Composer ────────────────────────────────── */
function drawToCanvas(canvas, W, H) {
  var t = EXPORT_THEMES[selectedExportTheme], q = exportQuote;
  var ctx = canvas.getContext('2d');
  canvas.width = W; canvas.height = H;

  if      (t.type === 'clouds')    drawCloudsBg(ctx,W,H);
  else if (t.type === 'mountains') drawMountainsBg(ctx,W,H);
  else if (t.type === 'ocean')     drawOceanBg(ctx,W,H);
  else if (t.type === 'forest')    drawForestBg(ctx,W,H);
  else { ctx.fillStyle = t.bg; ctx.fillRect(0,0,W,H); }

  if (t.glass) {
    ctx.fillStyle = t.glassBg; ctx.strokeStyle = t.glassBorder || t.border;
    ctx.lineWidth = Math.max(1, Math.round(W*0.0015));
    roundRect(ctx, W*0.07, H*0.13, W*0.86, H*0.69, W*0.035);
    ctx.fill(); ctx.stroke();
  }

  var pad = Math.round(W*0.04);
  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.002;
  ctx.strokeRect(pad,pad,W-pad*2,H-pad*2);
  ctx.globalAlpha = 0.2; ctx.lineWidth = W*0.001;
  ctx.strokeRect(pad+W*0.01,pad+W*0.01,W-pad*2-W*0.02,H-pad*2-W*0.02);
  ctx.globalAlpha = 1;

  ctx.font = 'bold ' + Math.round(W*0.028) + 'px serif';
  ctx.fillStyle = t.accent; ctx.textAlign = 'center';
  ctx.fillText('வெண்முரசு', W/2, W*0.09);

  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001;
  ctx.beginPath(); ctx.moveTo(W*0.2,W*0.105); ctx.lineTo(W*0.8,W*0.105); ctx.stroke();

  ctx.font = Math.round(W*0.11) + 'px serif';
  ctx.fillStyle = t.accent; ctx.globalAlpha = 0.1; ctx.textAlign = 'left';
  ctx.fillText('\u201C', W*0.09, H*0.35);
  ctx.globalAlpha = 1;

  var maxW = W*0.78, maxLines = 10, fsize = Math.round(W*0.035), lineH, lines;
  while (fsize >= Math.round(W*0.018)) {
    ctx.font = fsize + 'px serif'; lineH = Math.round(fsize*1.7);
    lines = wrapText(ctx, q.quote || '', maxW);
    if (lines.length <= maxLines) break;
    fsize -= Math.round(W*0.002);
  }
  ctx.font = fsize + 'px serif'; ctx.fillStyle = t.text; ctx.textAlign = 'center';
  var startY = Math.max(H*0.18, (H - lines.length*lineH)/2 - H*0.06);
  lines.forEach(function(line) { ctx.fillText(line, W/2, startY); startY += lineH; });

  var afterY = startY + H*0.03;
  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(W/2-W*0.13,afterY); ctx.lineTo(W/2+W*0.13,afterY); ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = 'italic ' + Math.round(W*0.026) + 'px serif';
  ctx.fillStyle = t.accent; ctx.textAlign = 'center';
  ctx.fillText('\u2014 ' + (q.character_name || ''), W/2, afterY + H*0.045);

  ctx.font = Math.round(W*0.02) + 'px serif'; ctx.fillStyle = t.meta;
  ctx.fillText((q.book || '') + (q.chapter ? ' \u00B7 ' + q.chapter : ''), W/2, afterY + H*0.085);

  ctx.strokeStyle = t.border; ctx.lineWidth = W*0.001;
  ctx.beginPath(); ctx.moveTo(W*0.2,H-W*0.105); ctx.lineTo(W*0.8,H-W*0.105); ctx.stroke();

  ctx.font = Math.round(W*0.018) + 'px serif'; ctx.fillStyle = t.meta; ctx.globalAlpha = 0.5;
  ctx.fillText('venmurasu.in', W/2, H - W*0.07);
  ctx.globalAlpha = 1;
}

function drawPreview() { drawToCanvas(document.getElementById('previewCanvas'), 540, 540); }

/* Download composite high-res image */
function doExport() {
  var canvas = document.getElementById('exportCanvas');
  drawToCanvas(canvas, 1080, 1080);
  canvas.style.display = 'block';
  var a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = 'venmurasu_' + (exportQuote.character_name || 'quote').replace(/\s+/g,'_') + '.png';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  canvas.style.display = 'none';
  closeModal();
}

/* Character width constraints wrap logic */
function wrapText(ctx, text, maxW) {
  var words = (text || '').split(/\s+/), lines = [], cur = '';
  words.forEach(function(w) {
    var test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW) { if (cur) lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  return lines;
}