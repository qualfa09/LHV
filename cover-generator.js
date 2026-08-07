/* ==========================================================================
   cover-generator.js
   ------------------------------------------------------------------------
   Menggambar cover laporan LHV secara otomatis di <canvas>, lalu
   menghasilkannya sebagai Blob PNG -- dipakai sebagai pengganti upload
   file cover manual. Desain meniru pola: diamond foto produk + latar
   pegunungan geometris ungu, warna & isi teks bisa diatur.
   ========================================================================== */

(function (global) {
  'use strict';

  const W = 1000;
  const H = 1414; // rasio dekat A4

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function loadImageFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
      img.onerror = reject;
      img.src = url;
    });
  }

  // --- Util warna: hex -> HSL, lalu bikin variasi shade dari 1 warna dasar ---
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  function hsl(h, s, l, a) {
    return `hsla(${h}, ${s}%, ${l}%, ${a === undefined ? 1 : a})`;
  }

  function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function diamondPath(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
  }

  function drawCoverFit(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale, sh = h / scale;
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  async function generateCoverImage(opts) {
    const {
      judulLaporan,
      namaLembaga,
      noLhv,
      namaPerusahaan,
      kbliKode,
      kbliDeskripsi,
      jenisBarang,
      tahun,
      baseColor,
      fotoProdukBlob,
      logoKemenperinSrc,
      logoBbsSrc,
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Latar putih
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    const navy = '#0d2c6c';
    const navySoft = '#33488a';
    const base = hexToHsl(baseColor || '#8e3d9c');

    // ---------------- Header: logo ----------------
    try {
      const [logoKp, logoBb] = await Promise.all([
        loadImage(logoKemenperinSrc),
        loadImage(logoBbsSrc),
      ]);
      const kpH = 95, kpW = (logoKp.width / logoKp.height) * kpH;
      const bbH = 95, bbW = (logoBb.width / logoBb.height) * bbH;
      const gap = 30;
      const totalW = kpW + gap + bbW;
      const startX = (W - totalW) / 2;
      ctx.drawImage(logoKp, startX, 30, kpW, kpH);
      ctx.drawImage(logoBb, startX + kpW + gap, 30, bbW, bbH);
    } catch (e) {
      console.warn('Cover: gagal memuat logo', e);
    }

    // ---------------- NO. LHV ----------------
    ctx.textAlign = 'center';
    ctx.fillStyle = navy;
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText('NO. LHV : ' + (noLhv || '-'), W / 2, 175);

    // ---------------- Judul ----------------
    ctx.font = '900 40px Arial, sans-serif';
    ctx.fillStyle = navy;
    const judulLines = wrapText(ctx, judulLaporan, W - 120);
    let judulY = 235;
    judulLines.forEach((line) => {
      ctx.fillText(line.toUpperCase(), W / 2, judulY);
      judulY += 46;
    });

    // ---------------- Subjudul (nama lembaga) ----------------
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillStyle = navy;
    const subLines = wrapText(ctx, namaLembaga, W - 200);
    let subY = judulY + 30;
    subLines.forEach((line) => {
      ctx.fillText(line, W / 2, subY);
      subY += 36;
    });

    // ---------------- Diamond foto produk ----------------
    const diamondCx = 130;
    const diamondCy = subY + 260;
    const diamondR = 300;
    const borderW = 16;

    // border gradient (diamond luar)
    const grad = ctx.createLinearGradient(
      diamondCx - diamondR, diamondCy - diamondR,
      diamondCx + diamondR, diamondCy + diamondR
    );
    grad.addColorStop(0, hsl(base.h, base.s, Math.max(base.l - 20, 15)));
    grad.addColorStop(0.5, hsl(base.h, base.s, base.l));
    grad.addColorStop(1, hsl(base.h - 10, Math.max(base.s - 15, 20), Math.min(base.l + 25, 85)));
    diamondPath(ctx, diamondCx, diamondCy, diamondR);
    ctx.strokeStyle = grad;
    ctx.lineWidth = borderW;
    ctx.stroke();

    // foto produk (clip diamond dalam)
    if (fotoProdukBlob) {
      try {
        const img = await loadImageFromBlob(fotoProdukBlob);
        ctx.save();
        diamondPath(ctx, diamondCx, diamondCy, diamondR - borderW);
        ctx.clip();
        drawCoverFit(ctx, img, diamondCx - diamondR, diamondCy - diamondR, diamondR * 2, diamondR * 2);
        ctx.restore();
      } catch (e) {
        console.warn('Cover: gagal memuat foto produk', e);
      }
    }

    // ---------------- Teks kanan: perusahaan, bidang usaha, jenis barang ----------------
    const rightX = 555;
    const rightW = W - rightX - 60;
    let ty = diamondCy - diamondR + 80;

    ctx.textAlign = 'left';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = navy;
    wrapText(ctx, namaPerusahaan || '-', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 40;
    });

    ty += 40;
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('BIDANG USAHA :', rightX, ty);
    ty += 36;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = navySoft;
    ctx.fillText('KBLI ' + (kbliKode || '-'), rightX, ty);
    ty += 32;
    wrapText(ctx, kbliDeskripsi || '', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 30;
    });

    ty += 36;
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = navy;
    ctx.fillText('JENIS BARANG :', rightX, ty);
    ty += 36;
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = navySoft;
    wrapText(ctx, jenisBarang || '-', rightW).forEach((line) => {
      ctx.fillText(line, rightX, ty);
      ty += 30;
    });

    // ---------------- Pola gunung (bawah) ----------------
    const peakTop = H - 430;
    const shades = [
      hsl(base.h, base.s, Math.max(base.l - 28, 12)),
      hsl(base.h, base.s, Math.max(base.l - 10, 20)),
      hsl(base.h, Math.max(base.s - 10, 20), base.l),
      hsl(base.h - 8, Math.max(base.s - 20, 15), Math.min(base.l + 18, 80)),
      hsl(base.h + 6, base.s, Math.max(base.l - 18, 15)),
    ];
    function tri(x1, yTop, x2, x3) {
      ctx.beginPath();
      ctx.moveTo(x1, H);
      ctx.lineTo((x1 + x2) / 2, yTop);
      ctx.lineTo(x2, H);
      ctx.closePath();
    }
    ctx.fillStyle = shades[0];
    tri(-50, peakTop + 60, 260, 0); ctx.fill();
    ctx.fillStyle = shades[1];
    tri(120, peakTop - 40, 480, 0); ctx.fill();
    ctx.fillStyle = shades[2];
    tri(380, peakTop + 100, 700, 0); ctx.fill();
    ctx.fillStyle = shades[3];
    tri(-80, peakTop + 160, 150, 0); ctx.fill();
    ctx.fillStyle = shades[4];
    tri(620, peakTop + 20, W + 60, 0); ctx.fill();

    // ---------------- Tahun ----------------
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px Arial, sans-serif';
    ctx.fillText(String(tahun || new Date().getFullYear()), 70, H - 90);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  global.CoverGenerator = { generateCoverImage };
})(window);
