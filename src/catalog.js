import fs from 'node:fs/promises';
import path from 'node:path';
import { formatBytes } from './utils.js';

export async function generateCatalog(results, config, outputDir) {
  const successResults = results.filter(r => !r.error);
  const cards = successResults.map(r => buildCard(r)).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sharpey Catalog</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      padding: 2rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; color: #f8fafc; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; font-size: 0.875rem; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(800px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: #1e293b;
      border-radius: 8px;
      padding: 1.5rem;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
    }
    .card-header h2 {
      font-size: 1rem;
      color: #f8fafc;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .card-meta {
      color: #64748b;
      font-size: 0.75rem;
    }
    .compare {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    .compare-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .compare-label {
      color: #94a3b8;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .compare-frame {
      width: 100%;
      aspect-ratio: var(--aspect);
      border-radius: 6px;
      overflow: hidden;
      background: #0f172a;
    }
    .compare-frame img,
    .compare-frame canvas {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
    .compare-frame .lqip {
      image-rendering: auto;
    }
    .compare-size {
      color: #475569;
      font-size: 0.65rem;
      margin-top: 0.35rem;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
  </style>
</head>
<body>
  <h1>Sharpey Catalog</h1>
  <p class="subtitle">${successResults.length} image${successResults.length > 1 ? 's' : ''} | ${config.sizes.join(', ')}px | ${config.formats.join(', ')}</p>
  <div class="grid">
${cards}
  </div>
<script>
${blurhashDecoder()}
</script>
</body>
</html>`;

  const catalogPath = path.join(outputDir, 'sharpey-catalog.html');
  await fs.writeFile(catalogPath, html, 'utf-8');
  return catalogPath;
}

function buildCard(result) {
  const { stem, originalWidth, originalHeight, variants, lqip } = result;
  const totalSize = variants.reduce((s, v) => s + v.size, 0);
  const aspect = (originalWidth / originalHeight).toFixed(4);

  const smallestJpeg = getSmallestVariant(variants);

  const lqipCell = lqip?.base64DataUri
    ? `      <div class="compare-item">
        <span class="compare-label">LQIP</span>
        <div class="compare-frame" style="--aspect: ${aspect}">
          <img class="lqip" src="${lqip.base64DataUri}" alt="">
        </div>
        <span class="compare-size">~${estimateBase64Size(lqip.base64DataUri)} inline</span>
      </div>`
    : '';

  const blurhashCell = lqip?.blurhash
    ? `      <div class="compare-item">
        <span class="compare-label">BlurHash</span>
        <div class="compare-frame" style="--aspect: ${aspect}">
          <canvas data-bh="${lqip.blurhash.hash}" data-bh-w="${originalWidth}" data-bh-h="${originalHeight}"></canvas>
        </div>
        <span class="compare-size">${lqip.blurhash.hash.length} chars</span>
      </div>`
    : '';

  return `    <div class="card">
      <div class="card-header">
        <h2>${stem}</h2>
        <span class="card-meta">${originalWidth}&times;${originalHeight} &middot; ${variants.length} variants &middot; ${formatBytes(totalSize)}</span>
      </div>
      <div class="compare">
${lqipCell}
${blurhashCell}
      <div class="compare-item">
        <span class="compare-label">Picture</span>
        <div class="compare-frame" style="--aspect: ${aspect}">
          <img src="${smallestJpeg}" alt="">
        </div>
        <span class="compare-size">${smallestJpeg}</span>
      </div>
      </div>
    </div>`;
}

function getSmallestVariant(variants) {
  const jpeg = variants.filter(v => v.format === 'jpeg').sort((a, b) => a.width - b.width);
  if (jpeg.length > 0) return jpeg[0].filename;
  const sorted = [...variants].sort((a, b) => a.width - b.width);
  return sorted[0]?.filename || '';
}

function estimateBase64Size(dataUri) {
  const base64 = dataUri.split(',')[1] || '';
  const bytes = Math.ceil(base64.length * 3 / 4);
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function blurhashDecoder() {
  return `(function(){
  var C="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";
  function d83(s){var v=0;for(var i=0;i<s.length;i++)v=v*83+C.indexOf(s[i]);return v}
  function sL(v){v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)}
  function lS(v){v=Math.max(0,Math.min(1,v));return v<=.0031308?Math.round(v*12.92*255+.5):Math.round((1.055*Math.pow(v,1/2.4)-.055)*255+.5)}
  function sP(v,e){return(v<0?-1:1)*Math.pow(Math.abs(v),e)}
  function dDC(v){return[sL(v>>16),sL((v>>8)&255),sL(v&255)]}
  function dAC(v,m){var r=Math.floor(v/361),g=Math.floor(v/19)%19,b=v%19;return[sP((r-9)/9,2)*m,sP((g-9)/9,2)*m,sP((b-9)/9,2)*m]}
  function decode(hash,w,h){
    var sf=d83(hash[0]),ny=Math.floor(sf/9)+1,nx=(sf%9)+1;
    var m=(d83(hash[1])+1)/166,colors=[dDC(d83(hash.substring(2,6)))];
    for(var i=1;i<nx*ny;i++)colors.push(dAC(d83(hash.substring(4+i*2,6+i*2)),m));
    var px=new Uint8ClampedArray(w*h*4);
    for(var y=0;y<h;y++)for(var x=0;x<w;x++){
      var r=0,g=0,b=0;
      for(var j=0;j<ny;j++)for(var i=0;i<nx;i++){
        var basis=Math.cos(Math.PI*x*i/w)*Math.cos(Math.PI*y*j/h);
        var c=colors[i+j*nx];r+=c[0]*basis;g+=c[1]*basis;b+=c[2]*basis;
      }
      var idx=4*(x+y*w);px[idx]=lS(r);px[idx+1]=lS(g);px[idx+2]=lS(b);px[idx+3]=255;
    }
    return px;
  }
  document.querySelectorAll("canvas[data-bh]").forEach(function(el){
    var hash=el.getAttribute("data-bh");
    var ow=+el.getAttribute("data-bh-w"),oh=+el.getAttribute("data-bh-h");
    var pw=Math.min(64,ow),ph=Math.round(pw*oh/ow);
    el.width=pw;el.height=ph;
    try{
      var px=decode(hash,pw,ph);
      var ctx=el.getContext("2d");
      var img=ctx.createImageData(pw,ph);
      img.data.set(px);ctx.putImageData(img,0,0);
    }catch(e){console.error("BH error:",e)}
  });
})();`;
}
