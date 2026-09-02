(function(){
  'use strict';

  const LS_PRODUKTE = 'kommi:produkte';
  const LS_KARTONS = 'kommi:kartons';
  const CAPTURE_W = 640;
  const CAPTURE_H = 480;

  const state = {
    produkte: loadJSON(LS_PRODUKTE, []),
    kartons: loadJSON(LS_KARTONS, []),
    lieferschein: null,
    editProduktId: null,
    editKartonId: null,
    referenzImageData: null,
    pxPerMm: null,
    calibPoints: [],
    letzteAuswertung: null,
  };

  function loadJSON(key, fallback){
    try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch(e){ return fallback; }
  }
  function saveJSON(key, val){
    try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){}
  }
  function uid(){
    return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  }
  function num(v, fallback){
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function fmt(n, digits){
    return Number(n).toLocaleString('de-DE', { maximumFractionDigits: digits === undefined ? 1 : digits });
  }
  function el(id){ return document.getElementById(id); }

  function produktByArtikelnummer(nr){
    return state.produkte.find(p => p.artikelnummer.toLowerCase() === String(nr).toLowerCase());
  }

  // ---------------------------------------------------------------------
  // Produktkatalog
  // ---------------------------------------------------------------------

  function renderProdukte(){
    const tbody = el('produktTable').querySelector('tbody');
    tbody.innerHTML = '';
    state.produkte.slice().sort((a,b)=>a.artikelnummer.localeCompare(b.artikelnummer)).forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(p.artikelnummer) + '</td>' +
        '<td>' + escapeHtml(p.bezeichnung||'') + '</td>' +
        '<td class="num">' + fmt(p.laenge,0) + ' × ' + fmt(p.breite,0) + ' × ' + fmt(p.hoehe,0) + '</td>' +
        '<td class="row-actions"><button type="button" data-edit="' + p.id + '" title="Bearbeiten">✎</button><button type="button" data-del="' + p.id + '" title="Löschen">🗑</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click', ()=>editProdukt(btn.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click', ()=>deleteProdukt(btn.dataset.del)));
    renderLieferschein();
  }

  function editProdukt(id){
    const p = state.produkte.find(x=>x.id===id);
    if(!p) return;
    state.editProduktId = id;
    el('pArtikelnummer').value = p.artikelnummer;
    el('pBezeichnung').value = p.bezeichnung||'';
    el('pLaenge').value = p.laenge;
    el('pBreite').value = p.breite;
    el('pHoehe').value = p.hoehe;
    el('pGewicht').value = p.gewicht||'';
    el('cardProdukte').open = true;
  }

  function deleteProdukt(id){
    if(!confirm('Diesen Artikel aus dem Produktkatalog löschen?')) return;
    state.produkte = state.produkte.filter(p=>p.id!==id);
    saveJSON(LS_PRODUKTE, state.produkte);
    renderProdukte();
  }

  function clearProduktForm(){
    state.editProduktId = null;
    el('produktForm').reset();
  }

  function saveProdukt(){
    const artikelnummer = el('pArtikelnummer').value.trim();
    if(!artikelnummer){ alert('Bitte eine Artikelnummer angeben.'); return; }
    const laenge = num(el('pLaenge').value), breite = num(el('pBreite').value), hoehe = num(el('pHoehe').value);
    if(laenge<=0 || breite<=0 || hoehe<=0){ alert('Bitte Länge, Breite und Höhe (> 0) angeben.'); return; }
    const data = {
      id: state.editProduktId || uid(),
      artikelnummer,
      bezeichnung: el('pBezeichnung').value.trim(),
      laenge, breite, hoehe,
      gewicht: num(el('pGewicht').value, 0) || undefined,
    };
    const existingIdx = state.produkte.findIndex(p=>p.id===data.id);
    if(existingIdx>=0) state.produkte[existingIdx] = data; else state.produkte.push(data);
    saveJSON(LS_PRODUKTE, state.produkte);
    clearProduktForm();
    renderProdukte();
  }

  // ---------------------------------------------------------------------
  // Kartonliste
  // ---------------------------------------------------------------------

  function renderKartons(){
    const tbody = el('kartonTable').querySelector('tbody');
    tbody.innerHTML = '';
    state.kartons.slice().sort((a,b)=> (a.laenge*a.breite*a.hoehe) - (b.laenge*b.breite*b.hoehe)).forEach(k=>{
      const vol = k.laenge*k.breite*k.hoehe/1e6; // Liter
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(k.name) + '</td>' +
        '<td class="num">' + fmt(k.laenge,0) + ' × ' + fmt(k.breite,0) + ' × ' + fmt(k.hoehe,0) + '</td>' +
        '<td class="num">' + fmt(vol,1) + ' L</td>' +
        '<td class="row-actions"><button type="button" data-edit="' + k.id + '" title="Bearbeiten">✎</button><button type="button" data-del="' + k.id + '" title="Löschen">🗑</button></td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click', ()=>editKarton(btn.dataset.edit)));
    tbody.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click', ()=>deleteKarton(btn.dataset.del)));
  }

  function editKarton(id){
    const k = state.kartons.find(x=>x.id===id);
    if(!k) return;
    state.editKartonId = id;
    el('kName').value = k.name;
    el('kLaenge').value = k.laenge;
    el('kBreite').value = k.breite;
    el('kHoehe').value = k.hoehe;
    el('kMaxGewicht').value = k.maxGewicht||'';
    el('cardKartons').open = true;
  }

  function deleteKarton(id){
    if(!confirm('Diesen Karton aus der Liste löschen?')) return;
    state.kartons = state.kartons.filter(k=>k.id!==id);
    saveJSON(LS_KARTONS, state.kartons);
    renderKartons();
  }

  function clearKartonForm(){
    state.editKartonId = null;
    el('kartonForm').reset();
  }

  function saveKarton(){
    const name = el('kName').value.trim();
    if(!name){ alert('Bitte eine Bezeichnung angeben.'); return; }
    const laenge = num(el('kLaenge').value), breite = num(el('kBreite').value), hoehe = num(el('kHoehe').value);
    if(laenge<=0 || breite<=0 || hoehe<=0){ alert('Bitte Innenmaße (> 0) angeben.'); return; }
    const data = {
      id: state.editKartonId || uid(),
      name, laenge, breite, hoehe,
      maxGewicht: num(el('kMaxGewicht').value, 0) || undefined,
    };
    const existingIdx = state.kartons.findIndex(k=>k.id===data.id);
    if(existingIdx>=0) state.kartons[existingIdx] = data; else state.kartons.push(data);
    saveJSON(LS_KARTONS, state.kartons);
    clearKartonForm();
    renderKartons();
  }

  // ---------------------------------------------------------------------
  // Lieferschein Import (CSV / JSON, Datei / URL / Text)
  // ---------------------------------------------------------------------

  function parseCSV(text){
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length);
    if(!lines.length) throw new Error('Datei ist leer.');
    const delim = lines[0].includes(';') ? ';' : ',';
    const strip = s => s.trim().replace(/^"|"$/g,'');
    const header = lines[0].split(delim).map(h=>strip(h).toLowerCase());
    const idxArt = header.findIndex(h=>['artikelnummer','artikel-nr','artnr','art.-nr.','sku'].includes(h));
    const idxBez = header.findIndex(h=>['bezeichnung','name','beschreibung','artikel'].includes(h));
    const idxMenge = header.findIndex(h=>['menge','anzahl','qty','stück','stueck'].includes(h));
    if(idxArt<0 || idxMenge<0){
      throw new Error('Spalten "Artikelnummer" und "Menge" nicht gefunden. Erwartetes Format: Artikelnummer;Bezeichnung;Menge');
    }
    const positionen = lines.slice(1).map(line=>{
      const cols = line.split(delim).map(strip);
      return {
        artikelnummer: cols[idxArt] || '',
        bezeichnung: idxBez>=0 ? (cols[idxBez]||'') : '',
        menge: num(cols[idxMenge], 0),
      };
    }).filter(p=>p.artikelnummer);
    return { auftragsnummer: '', positionen };
  }

  function parseLieferscheinText(text){
    const trimmed = text.trim();
    if(!trimmed) throw new Error('Kein Inhalt zum Einlesen.');
    if(trimmed.startsWith('{') || trimmed.startsWith('[')){
      const data = JSON.parse(trimmed);
      const positionen = (Array.isArray(data) ? data : (data.positionen||[])).map(p=>({
        artikelnummer: String(p.artikelnummer||p.sku||'').trim(),
        bezeichnung: String(p.bezeichnung||p.name||'').trim(),
        menge: num(p.menge ?? p.anzahl ?? p.qty, 0),
      })).filter(p=>p.artikelnummer);
      return { auftragsnummer: Array.isArray(data) ? '' : String(data.auftragsnummer||''), positionen };
    }
    return parseCSV(trimmed);
  }

  function applyLieferschein(data, sourceLabel){
    if(!data.positionen.length){
      showMsg('lieferscheinMsg', 'Keine Positionen gefunden.', 'error');
      return;
    }
    state.lieferschein = data;
    showMsg('lieferscheinMsg', 'Lieferschein geladen' + (sourceLabel ? ' (' + sourceLabel + ')' : '') + ': ' + data.positionen.length + ' Position(en).', 'ok');
    renderLieferschein();
    el('kontrollTableWrap').hidden = true;
    el('kontrollBanner').hidden = true;
    el('boxSuggestions').innerHTML = '';
  }

  function showMsg(id, text, kind){
    const node = el(id);
    node.textContent = text;
    node.className = 'msg ' + kind;
    node.hidden = false;
  }

  function renderLieferschein(){
    if(!state.lieferschein){ el('lieferscheinTableWrap').hidden = true; return; }
    el('lieferscheinTableWrap').hidden = false;
    el('lieferscheinAuftrag').textContent = state.lieferschein.auftragsnummer ? ('Auftrag ' + state.lieferschein.auftragsnummer) : 'Lieferschein';
    const tbody = el('lieferscheinTable').querySelector('tbody');
    tbody.innerHTML = '';
    let totalMenge = 0, totalVolumeL = 0, allKnown = true;
    state.lieferschein.positionen.forEach((pos, i)=>{
      totalMenge += pos.menge;
      const prod = produktByArtikelnummer(pos.artikelnummer);
      const tr = document.createElement('tr');
      let masseCell;
      if(prod){
        masseCell = fmt(prod.laenge,0) + '×' + fmt(prod.breite,0) + '×' + fmt(prod.hoehe,0) + ' mm';
        totalVolumeL += (prod.laenge*prod.breite*prod.hoehe/1e6) * pos.menge;
      } else {
        masseCell = '<span class="status-pill warn">unbekannt</span>';
        allKnown = false;
      }
      tr.innerHTML =
        '<td>' + escapeHtml(pos.artikelnummer) + '</td>' +
        '<td>' + escapeHtml(pos.bezeichnung || (prod?prod.bezeichnung:'') || '') + '</td>' +
        '<td class="num">' + fmt(pos.menge,0) + '</td>' +
        '<td>' + masseCell + '</td>' +
        '<td class="row-actions">' + (prod?'':'<button type="button" data-addprod="'+i+'" title="Maße jetzt anlegen">➕ Maße</button>') + '</td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('[data-addprod]').forEach(btn=>btn.addEventListener('click', ()=>{
      const pos = state.lieferschein.positionen[Number(btn.dataset.addprod)];
      clearProduktForm();
      el('pArtikelnummer').value = pos.artikelnummer;
      el('pBezeichnung').value = pos.bezeichnung||'';
      el('cardProdukte').open = true;
      el('pLaenge').focus();
    }));
    el('lieferscheinSumme').textContent = fmt(totalMenge,0) + ' Stück gesamt' + (allKnown ? ' · ' + fmt(totalVolumeL,2) + ' L Gesamtvolumen' : ' · Maße für einige Artikel fehlen');
  }

  // ---------------------------------------------------------------------
  // Kamera
  // ---------------------------------------------------------------------

  let mediaStream = null;
  const videoEl = () => el('camVideo');

  async function refreshCameraList(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter(d=>d.kind==='videoinput');
      const sel = el('cameraSelect');
      const current = sel.value;
      sel.innerHTML = '<option value="">Kamera wählen…</option>';
      cams.forEach((c,i)=>{
        const opt = document.createElement('option');
        opt.value = c.deviceId;
        opt.textContent = c.label || ('Kamera ' + (i+1));
        sel.appendChild(opt);
      });
      if(current) sel.value = current;
    }catch(e){ /* enumerateDevices ohne Berechtigung liefert ggf. leere Labels - unkritisch */ }
  }

  async function startCamera(){
    stopCamera();
    const deviceId = el('cameraSelect').value;
    const constraints = {
      video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };
    try{
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    }catch(e){
      alert('Kamera konnte nicht gestartet werden: ' + e.message);
      return;
    }
    videoEl().srcObject = mediaStream;
    await videoEl().play();
    el('btnStartCam').disabled = true;
    el('btnStopCam').disabled = false;
    el('btnCaptureRef').disabled = false;
    await refreshCameraList();
  }

  function stopCamera(){
    if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; }
    videoEl().srcObject = null;
    el('btnStartCam').disabled = false;
    el('btnStopCam').disabled = true;
    el('btnCaptureRef').disabled = true;
    el('btnCapturePhoto').disabled = true;
  }

  function captureToCanvas(){
    const canvas = el('workCanvas');
    canvas.width = CAPTURE_W; canvas.height = CAPTURE_H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(videoEl(), 0, 0, CAPTURE_W, CAPTURE_H);
    return { canvas, ctx, imageData: ctx.getImageData(0, 0, CAPTURE_W, CAPTURE_H) };
  }

  function captureReference(){
    const { imageData, canvas } = captureToCanvas();
    state.referenzImageData = imageData;
    state.pxPerMm = null;
    state.calibPoints = [];

    const calibCanvas = el('calibCanvas');
    calibCanvas.width = CAPTURE_W; calibCanvas.height = CAPTURE_H;
    calibCanvas.getContext('2d').drawImage(canvas, 0, 0);
    el('calibBlock').hidden = false;
    el('calibStatus').textContent = 'Nicht kalibriert – Zählung erfolgt ohne Artikel-Zuordnung.';
    el('btnCapturePhoto').disabled = false;
  }

  function drawCalibMarkers(){
    const calibCanvas = el('calibCanvas');
    const ctx = calibCanvas.getContext('2d');
    ctx.putImageData(state.referenzImageData, 0, 0);
    ctx.fillStyle = '#2FBF71';
    ctx.strokeStyle = '#2FBF71';
    ctx.lineWidth = 2;
    state.calibPoints.forEach(p=>{
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
    });
    if(state.calibPoints.length===2){
      ctx.beginPath();
      ctx.moveTo(state.calibPoints[0].x, state.calibPoints[0].y);
      ctx.lineTo(state.calibPoints[1].x, state.calibPoints[1].y);
      ctx.stroke();
    }
  }

  function onCalibClick(evt){
    if(!state.referenzImageData) return;
    const calibCanvas = el('calibCanvas');
    const rect = calibCanvas.getBoundingClientRect();
    const x = (evt.clientX - rect.left) * (calibCanvas.width/rect.width);
    const y = (evt.clientY - rect.top) * (calibCanvas.height/rect.height);
    if(state.calibPoints.length>=2) state.calibPoints = [];
    state.calibPoints.push({x,y});
    drawCalibMarkers();
    if(state.calibPoints.length===2){
      const mm = num(el('calibDistance').value, 0);
      if(mm<=0){
        alert('Bitte zuerst die bekannte Distanz in mm eingeben.');
        state.calibPoints = [];
        drawCalibMarkers();
        return;
      }
      const dx = state.calibPoints[1].x - state.calibPoints[0].x;
      const dy = state.calibPoints[1].y - state.calibPoints[0].y;
      const pxDist = Math.hypot(dx,dy);
      state.pxPerMm = pxDist / mm;
      el('calibStatus').textContent = 'Kalibriert: ' + fmt(state.pxPerMm,3) + ' px/mm – artikelgenaue Zuordnung aktiv.';
    }
  }

  // ---------------------------------------------------------------------
  // Bildabgleich: Differenzerkennung (Background Subtraction) + Blob-Zählung
  // ---------------------------------------------------------------------

  function computeMask(refData, curData, threshold){
    const { width, height, data: rd } = refData;
    const cd = curData.data;
    const mask = new Uint8Array(width*height);
    for(let i=0, p=0; i<rd.length; i+=4, p++){
      const dr = rd[i]-cd[i], dg = rd[i+1]-cd[i+1], db = rd[i+2]-cd[i+2];
      mask[p] = Math.sqrt(dr*dr+dg*dg+db*db) > threshold ? 1 : 0;
    }
    return mask;
  }

  function findBlobs(mask, width, height, minArea){
    const visited = new Uint8Array(width*height);
    const blobs = [];
    const stack = new Int32Array(width*height);
    for(let y=0; y<height; y++){
      for(let x=0; x<width; x++){
        const start = y*width+x;
        if(!mask[start] || visited[start]) continue;
        let sp = 0;
        stack[sp++] = start; visited[start] = 1;
        let minX=x, maxX=x, minY=y, maxY=y, count=0;
        while(sp>0){
          const cur = stack[--sp];
          const cx = cur % width, cy = (cur - cx) / width;
          count++;
          if(cx<minX) minX=cx; if(cx>maxX) maxX=cx;
          if(cy<minY) minY=cy; if(cy>maxY) maxY=cy;
          if(cx>0 && mask[cur-1] && !visited[cur-1]){ visited[cur-1]=1; stack[sp++]=cur-1; }
          if(cx<width-1 && mask[cur+1] && !visited[cur+1]){ visited[cur+1]=1; stack[sp++]=cur+1; }
          if(cy>0 && mask[cur-width] && !visited[cur-width]){ visited[cur-width]=1; stack[sp++]=cur-width; }
          if(cy<height-1 && mask[cur+width] && !visited[cur+width]){ visited[cur+width]=1; stack[sp++]=cur+width; }
        }
        if(count>=minArea){
          blobs.push({ minX, maxX, minY, maxY, area: count, w: maxX-minX+1, h: maxY-minY+1 });
        }
      }
    }
    return blobs;
  }

  function matchBlobsToProducts(blobs, positionen, pxPerMm){
    const expected = [];
    positionen.forEach(pos=>{
      const prod = produktByArtikelnummer(pos.artikelnummer);
      if(!prod) return;
      for(let i=0;i<pos.menge;i++) expected.push({ artikelnummer: pos.artikelnummer, l: prod.laenge, b: prod.breite });
    });

    const used = new Array(expected.length).fill(false);
    const results = blobs.map(blob=>{
      const wMm = blob.w/pxPerMm, hMm = blob.h/pxPerMm;
      let bestIdx=-1, bestScore=Infinity;
      expected.forEach((exp,i)=>{
        if(used[i]) return;
        const score = Math.min(Math.abs(wMm-exp.l)+Math.abs(hMm-exp.b), Math.abs(wMm-exp.b)+Math.abs(hMm-exp.l));
        if(score<bestScore){ bestScore=score; bestIdx=i; }
      });
      if(bestIdx>=0){ used[bestIdx]=true; return { ...blob, artikelnummer: expected[bestIdx].artikelnummer }; }
      return { ...blob, artikelnummer: null };
    });

    const counts = {};
    results.forEach(r=>{ if(r.artikelnummer) counts[r.artikelnummer] = (counts[r.artikelnummer]||0)+1; });
    return { results, counts, unassigned: results.filter(r=>!r.artikelnummer).length };
  }

  function runFotokontrolle(){
    if(!state.referenzImageData){ alert('Bitte zuerst ein Referenzfoto des leeren Tischs aufnehmen.'); return; }
    if(!state.lieferschein){ alert('Bitte zuerst einen Lieferschein laden.'); return; }

    const { imageData: curData } = captureToCanvas();
    const threshold = num(el('diffThreshold').value, 35);
    const minArea = num(el('minBlobArea').value, 150);

    const mask = computeMask(state.referenzImageData, curData, threshold);
    const blobs = findBlobs(mask, CAPTURE_W, CAPTURE_H, minArea);

    const resultCanvas = el('resultCanvas');
    resultCanvas.width = CAPTURE_W; resultCanvas.height = CAPTURE_H;
    const ctx = resultCanvas.getContext('2d');
    ctx.putImageData(curData, 0, 0);

    const totalExpected = state.lieferschein.positionen.reduce((s,p)=>s+p.menge,0);
    let perArticle = null, unassigned = 0;

    if(state.pxPerMm){
      const matched = matchBlobsToProducts(blobs, state.lieferschein.positionen, state.pxPerMm);
      perArticle = matched.counts;
      unassigned = matched.unassigned;
      matched.results.forEach(r=>{
        ctx.strokeStyle = r.artikelnummer ? '#2FBF71' : '#E5484D';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.minX, r.minY, r.w, r.h);
        if(r.artikelnummer){
          ctx.fillStyle = '#2FBF71';
          ctx.font = '12px IBM Plex Mono, monospace';
          ctx.fillText(r.artikelnummer, r.minX+3, Math.max(12, r.minY-4));
        }
      });
    } else {
      blobs.forEach(b=>{
        ctx.strokeStyle = '#24B6C4';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.minX, b.minY, b.w, b.h);
      });
    }

    state.letzteAuswertung = { erkanntGesamt: blobs.length, perArticle, unassigned };
    renderKontrollergebnis(blobs.length, perArticle, unassigned, totalExpected);
  }

  function statusPill(erkannt, erwartet){
    if(erkannt === erwartet) return '<span class="status-pill ok">✓ stimmt</span>';
    if(erkannt < erwartet) return '<span class="status-pill error">fehlt ' + (erwartet-erkannt) + '</span>';
    return '<span class="status-pill warn">zu viel ' + (erkannt-erwartet) + '</span>';
  }

  function renderKontrollergebnis(erkanntGesamt, perArticle, unassigned, totalExpected){
    const tbody = el('kontrollTable').querySelector('tbody');
    tbody.innerHTML = '';
    let allOk = true;

    if(perArticle){
      state.lieferschein.positionen.forEach(pos=>{
        const erkannt = perArticle[pos.artikelnummer] || 0;
        if(erkannt !== pos.menge) allOk = false;
        const prod = produktByArtikelnummer(pos.artikelnummer);
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + escapeHtml(pos.artikelnummer) + '</td>' +
          '<td>' + escapeHtml(pos.bezeichnung || (prod?prod.bezeichnung:'') || '') + '</td>' +
          '<td class="num">' + fmt(pos.menge,0) + '</td>' +
          '<td class="num">' + fmt(erkannt,0) + '</td>' +
          '<td>' + statusPill(erkannt, pos.menge) + '</td>';
        tbody.appendChild(tr);
      });
      el('kontrollHint').textContent = unassigned>0
        ? ('⚠ ' + unassigned + ' erkannte(s) Objekt(e) konnte(n) keinem Artikel eindeutig zugeordnet werden (Fremdobjekt oder unpassende Maße im Katalog).')
        : 'Alle erkannten Objekte konnten einem Artikel zugeordnet werden.';
    } else {
      allOk = erkanntGesamt === totalExpected;
      const tr = document.createElement('tr');
      tr.innerHTML =
        '<td colspan="2">Gesamtzahl aller Positionen (keine Kalibrierung, daher keine Artikel-Zuordnung)</td>' +
        '<td class="num">' + fmt(totalExpected,0) + '</td>' +
        '<td class="num">' + fmt(erkanntGesamt,0) + '</td>' +
        '<td>' + statusPill(erkanntGesamt, totalExpected) + '</td>';
      tbody.appendChild(tr);
      el('kontrollHint').textContent = 'Für eine artikelgenaue Prüfung bei mehreren unterschiedlichen Artikeln: Kalibrierung in Schritt 2 durchführen.';
    }

    el('kontrollTableWrap').hidden = false;
    showMsg('kontrollBanner', allOk ? '✓ Bestand stimmt mit dem Lieferschein überein.' : '⚠ Abweichung zwischen Tisch und Lieferschein festgestellt.', allOk ? 'ok' : 'warn');
  }

  // ---------------------------------------------------------------------
  // Kartonempfehlung (Shelf-Packing-Heuristik)
  // ---------------------------------------------------------------------

  function buildItemList(){
    const items = [];
    state.lieferschein.positionen.forEach(pos=>{
      const prod = produktByArtikelnummer(pos.artikelnummer);
      if(!prod) return;
      for(let i=0;i<pos.menge;i++) items.push({ l: prod.laenge, b: prod.breite, h: prod.hoehe, gewicht: prod.gewicht||0 });
    });
    return items;
  }

  function packSingleLayer(items, boxL, boxB){
    const info = items.map((it,i)=>{
      const opts = [{depth:it.l,width:it.b},{depth:it.b,width:it.l}].filter(o=>o.width <= boxB + 1e-6);
      if(!opts.length) return { i, skip:true };
      opts.sort((a,b)=>a.depth-b.depth);
      return { i, depth: opts[0].depth, width: opts[0].width, h: it.h };
    });
    const order = info.filter(v=>!v.skip).sort((a,b)=>b.depth-a.depth);

    const shelves = [];
    const placed = new Set();
    let usedDepth = 0;
    order.forEach(it=>{
      let shelf = shelves.find(s => boxB - s.usedWidth >= it.width - 1e-6);
      if(!shelf){
        if(usedDepth + it.depth > boxL + 1e-6) return;
        shelf = { depth: it.depth, usedWidth: 0 };
        shelves.push(shelf);
        usedDepth += it.depth;
      }
      shelf.usedWidth += it.width;
      placed.add(it.i);
    });

    let layerHeight = 0;
    items.forEach((it,i)=>{ if(placed.has(i)) layerHeight = Math.max(layerHeight, it.h); });
    const remaining = items.filter((_,i)=>!placed.has(i));
    return { placedCount: placed.size, layerHeight, remaining };
  }

  function packAllItems(items, box){
    let remaining = items.slice().sort((a,b)=>b.h-a.h);
    let heightUsed = 0, guard = 0;
    while(remaining.length && guard++ < 1000){
      const layer = packSingleLayer(remaining, box.laenge, box.breite);
      if(layer.placedCount===0) return { fits:false };
      heightUsed += layer.layerHeight;
      if(heightUsed > box.hoehe + 1e-6) return { fits:false };
      remaining = layer.remaining;
    }
    return { fits: remaining.length===0, usedHeight: heightUsed };
  }

  function evaluateBox(items, box){
    const totalItemVolume = items.reduce((s,it)=>s+it.l*it.b*it.h,0);
    const boxVolume = box.laenge*box.breite*box.hoehe;
    if(totalItemVolume > boxVolume) return { fits:false };
    const totalWeight = items.reduce((s,it)=>s+(it.gewicht||0),0);
    if(box.maxGewicht && totalWeight > box.maxGewicht) return { fits:false };
    const pack = packAllItems(items, box);
    if(!pack.fits) return { fits:false };
    return { fits:true, luftanteil: 1 - (totalItemVolume/boxVolume), totalItemVolume, boxVolume };
  }

  function suggestBoxes(){
    if(!state.lieferschein){ alert('Bitte zuerst einen Lieferschein laden.'); return; }
    const items = buildItemList();
    if(!items.length){ alert('Für die Positionen des Lieferscheins fehlen Produktmaße im Produktkatalog.'); return; }
    if(!state.kartons.length){ alert('Bitte zuerst mindestens einen Karton in der Kartonliste anlegen.'); return; }

    const evaluated = state.kartons.map(box=>({ box, ...evaluateBox(items, box) }));
    const passing = evaluated.filter(e=>e.fits).sort((a,b)=>a.luftanteil-b.luftanteil);

    const wrap = el('boxSuggestions');
    wrap.innerHTML = '';
    if(!passing.length){
      const biggest = evaluated.slice().sort((a,b)=>(b.box.laenge*b.box.breite*b.box.hoehe)-(a.box.laenge*a.box.breite*a.box.hoehe))[0];
      wrap.innerHTML = '<p class="msg error">Kein Karton aus der Liste fasst alle Positionen geometrisch. Größten verfügbaren Karton "' + escapeHtml(biggest.box.name) + '" prüfen oder auf mehrere Kartons aufteilen.</p>';
      return;
    }
    passing.forEach((res,i)=>{
      const pct = Math.round(res.luftanteil*100);
      const div = document.createElement('div');
      div.className = 'box-card' + (i===0 ? ' best' : '');
      div.innerHTML =
        '<div class="box-card-head"><strong>' + (i===0?'★ ':'') + escapeHtml(res.box.name) + '</strong><span class="hint">' + fmt(res.box.laenge,0) + '×' + fmt(res.box.breite,0) + '×' + fmt(res.box.hoehe,0) + ' mm</span></div>' +
        '<div class="box-air-bar"><span style="width:' + (100-pct) + '%"></span></div>' +
        '<p class="hint">Luftanteil ca. ' + pct + '% · Füllvolumen ' + fmt(res.totalItemVolume/1e6,2) + ' L von ' + fmt(res.boxVolume/1e6,2) + ' L</p>';
      wrap.appendChild(div);
    });
  }

  // ---------------------------------------------------------------------
  // Import-Handling
  // ---------------------------------------------------------------------

  function handleFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{ applyLieferschein(parseLieferscheinText(String(reader.result)), file.name); }
      catch(e){ showMsg('lieferscheinMsg', e.message, 'error'); }
    };
    reader.onerror = () => showMsg('lieferscheinMsg', 'Datei konnte nicht gelesen werden.', 'error');
    reader.readAsText(file);
  }

  async function loadFromUrl(){
    const url = el('lieferscheinUrl').value.trim();
    if(!url) return;
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      applyLieferschein(parseLieferscheinText(text), url);
    }catch(e){
      showMsg('lieferscheinMsg', 'Laden von URL fehlgeschlagen (' + e.message + '). Hinweis: Das Zielsystem muss CORS-Zugriffe von dieser Seite erlauben.', 'error');
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function init(){
    renderProdukte();
    renderKartons();

    el('lieferscheinFile').addEventListener('change', e=>{ if(e.target.files[0]) handleFile(e.target.files[0]); });
    el('btnLoadUrl').addEventListener('click', loadFromUrl);
    el('btnPasteToggle').addEventListener('click', ()=>{ el('pasteField').hidden = !el('pasteField').hidden; });
    el('btnParsePaste').addEventListener('click', ()=>{
      try{ applyLieferschein(parseLieferscheinText(el('lieferscheinPaste').value), 'eingefügt'); }
      catch(e){ showMsg('lieferscheinMsg', e.message, 'error'); }
    });

    el('btnProduktSave').addEventListener('click', saveProdukt);
    el('btnProduktClear').addEventListener('click', clearProduktForm);
    el('btnKartonSave').addEventListener('click', saveKarton);
    el('btnKartonClear').addEventListener('click', clearKartonForm);

    el('btnStartCam').addEventListener('click', startCamera);
    el('btnStopCam').addEventListener('click', stopCamera);
    el('btnCaptureRef').addEventListener('click', captureReference);
    el('calibCanvas').addEventListener('click', onCalibClick);

    el('diffThreshold').addEventListener('input', e=>{ el('diffThresholdVal').textContent = e.target.value; });
    el('minBlobArea').addEventListener('input', e=>{ el('minBlobAreaVal').textContent = e.target.value; });
    el('btnCapturePhoto').addEventListener('click', runFotokontrolle);

    el('btnSuggestBox').addEventListener('click', suggestBoxes);

    if(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices){
      refreshCameraList();
      navigator.mediaDevices.addEventListener && navigator.mediaDevices.addEventListener('devicechange', refreshCameraList);
    } else {
      el('btnStartCam').disabled = true;
      showMsg('lieferscheinMsg', 'Dieser Browser unterstützt keinen Kamerazugriff (getUserMedia).', 'warn');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
