(function brandedFavicon() {
  const img = new Image();
  img.onload = () => {
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const tctx = tmp.getContext('2d');
      tctx.drawImage(img, 0, 0);
      const data = tctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 12) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found = true;
          }
        }
      }
      if (!found) return;
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const side = Math.max(cw, ch);
      const offX = minX - (side - cw) / 2;
      const offY = minY - (side - ch) / 2;

      const SIZE = 128;
      const fav = document.createElement('canvas');
      fav.width = fav.height = SIZE;
      const fctx = fav.getContext('2d');
      fctx.imageSmoothingQuality = 'high';

      const r = 28;
      // Fundo preto com cantos arredondados
      fctx.fillStyle = '#000000';
      fctx.beginPath();
      fctx.moveTo(r, 0);
      fctx.lineTo(SIZE - r, 0);
      fctx.quadraticCurveTo(SIZE, 0, SIZE, r);
      fctx.lineTo(SIZE, SIZE - r);
      fctx.quadraticCurveTo(SIZE, SIZE, SIZE - r, SIZE);
      fctx.lineTo(r, SIZE);
      fctx.quadraticCurveTo(0, SIZE, 0, SIZE - r);
      fctx.lineTo(0, r);
      fctx.quadraticCurveTo(0, 0, r, 0);
      fctx.closePath();
      fctx.fill();
      fctx.save();
      fctx.clip();

      // Gradiente radial branco em volta da logo (centro brilhante, beirada preta)
      const radial = fctx.createRadialGradient(SIZE/2, SIZE/2, SIZE * 0.04, SIZE/2, SIZE/2, SIZE * 0.55);
      radial.addColorStop(0, 'rgba(255,255,255,0.55)');
      radial.addColorStop(0.5, 'rgba(255,255,255,0.18)');
      radial.addColorStop(1, 'rgba(255,255,255,0)');
      fctx.fillStyle = radial;
      fctx.fillRect(0, 0, SIZE, SIZE);
      fctx.restore();

      // Logo S sobre o glow
      const pad = SIZE * 0.16;
      const inner = SIZE - pad * 2;
      fctx.drawImage(img, offX, offY, side, side, pad, pad, inner, inner);

      let link = document.querySelector('link[rel="icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.type = 'image/png';
      link.href = fav.toDataURL('image/png');
    } catch (e) { /* canvas tainted — mantém favicon original */ }
  };
  img.src = 'logo.png';
})();
