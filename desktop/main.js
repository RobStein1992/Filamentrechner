/**
 * Druckkosten-Rechner – Desktop-Variante (Electron).
 *
 * Die App speichert alle Daten bei jeder Änderung sofort in eine Datei
 * (druckrechner-daten.json). Liegt der gewählte Ordner in iCloud Drive,
 * OneDrive, Google Drive oder Dropbox, übernimmt der jeweilige Cloud-Client
 * die Synchronisierung – ohne Anmeldung in dieser App und ohne fremden
 * Cloud-Dienst im Programm selbst.
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const DATA_FILE_NAME = 'druckrechner-daten.json';
const LOCATION_FILE_NAME = 'speicherort.json';
const FILE_VERSION = 1;

let mainWindow = null;
let dataFolder = null;
let values = {};              // key -> String
let writeQueue = Promise.resolve();
let watcher = null;
let watchTimer = null;

/* ---------------- Speicherort ---------------- */

function locationFilePath(){
  return path.join(app.getPath('userData'), LOCATION_FILE_NAME);
}

function readStoredFolder(){
  try {
    const raw = fs.readFileSync(locationFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.folder === 'string' && fs.existsSync(parsed.folder)) {
      return parsed.folder;
    }
  } catch (err) {}
  return null;
}

function writeStoredFolder(folder){
  try {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    fs.writeFileSync(locationFilePath(), JSON.stringify({ folder }, null, 2), 'utf8');
  } catch (err) {}
}

function dataFilePath(){
  return path.join(dataFolder, DATA_FILE_NAME);
}

/* ---------------- Datei lesen / schreiben ---------------- */

async function loadData(){
  try {
    const raw = await fsp.readFile(dataFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    values = (parsed && typeof parsed.values === 'object' && parsed.values) ? parsed.values : {};
  } catch (err) {
    // Datei existiert noch nicht oder ist unlesbar – mit leerem Stand starten.
    values = {};
  }
}

// Atomar schreiben: erst in eine Temp-Datei, dann umbenennen. So bleibt die
// Datei auch dann heil, wenn der Rechner mitten im Schreiben ausgeht oder der
// Cloud-Client gleichzeitig zugreift.
function persist(){
  writeQueue = writeQueue.then(async () => {
    const target = dataFilePath();
    const tmp = target + '.tmp';
    const payload = JSON.stringify({
      version: FILE_VERSION,
      updatedAt: new Date().toISOString(),
      values
    }, null, 2);

    await fsp.mkdir(dataFolder, { recursive: true });
    await fsp.writeFile(tmp, payload, 'utf8');
    await fsp.rename(tmp, target);
  }).catch((err) => {
    console.error('Daten konnten nicht gespeichert werden:', err);
  });
  return writeQueue;
}

/* ---------------- Fremdänderungen erkennen ---------------- */

// Ändert ein anderes Gerät die Datei (über den Cloud-Ordner), meldet sich die
// App im Fenster, statt den fremden Stand stillschweigend zu überschreiben.
function startWatching(){
  if (watcher) {
    try { watcher.close(); } catch (err) {}
    watcher = null;
  }
  if (!dataFolder) return;

  try {
    watcher = fs.watch(dataFolder, (eventType, filename) => {
      if (filename && filename !== DATA_FILE_NAME) return;

      if (watchTimer) clearTimeout(watchTimer);
      watchTimer = setTimeout(checkForForeignChange, 600);
    });
  } catch (err) {
    console.error('Ordner konnte nicht überwacht werden:', err);
  }
}

// Statt eines Zeitfensters wird der Inhalt verglichen: nur wenn sich die
// Werte tatsächlich von unserem Stand unterscheiden, war es ein anderes Gerät.
async function checkForForeignChange(){
  watchTimer = null;
  let raw;
  try {
    raw = await fsp.readFile(dataFilePath(), 'utf8');
  } catch (err) {
    return;
  }

  let fileValues;
  try {
    const parsed = JSON.parse(raw);
    fileValues = (parsed && typeof parsed.values === 'object' && parsed.values) ? parsed.values : {};
  } catch (err) {
    // Halb geschriebene Datei (Cloud-Client mitten im Sync) – beim nächsten
    // Ereignis noch einmal versuchen.
    return;
  }

  if (JSON.stringify(fileValues) === JSON.stringify(values)) return;

  values = fileValues;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('storage-changed');
  }
}

/* ---------------- IPC ---------------- */

ipcMain.handle('storage:get', (event, key) => {
  return typeof values[key] === 'string' ? { value: values[key] } : null;
});

ipcMain.handle('storage:set', async (event, key, value) => {
  values[key] = String(value);
  await persist();
  return true;
});

ipcMain.handle('storage:getInfo', () => {
  return { folder: dataFolder, filePath: dataFilePath() };
});

ipcMain.handle('storage:openFolder', async () => {
  if (dataFolder) await shell.openPath(dataFolder);
  return true;
});

ipcMain.handle('storage:chooseFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Ordner für die Daten wählen',
    defaultPath: dataFolder,
    buttonLabel: 'Diesen Ordner verwenden',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;

  const folder = result.filePaths[0];
  const target = path.join(folder, DATA_FILE_NAME);
  const adopted = fs.existsSync(target);

  dataFolder = folder;
  writeStoredFolder(folder);

  if (adopted) {
    // Im Zielordner liegt bereits eine Sicherung: dieses Gerät übernimmt sie.
    await loadData();
  } else {
    // Noch keine Datei vorhanden: aktuellen Stand dorthin mitnehmen.
    await persist();
  }
  startWatching();

  return { folder, filePath: target, adopted };
});

/* ---------------- Fenster ---------------- */

function createWindow(){
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0B0E17',
    autoHideMenuBar: true,
    title: 'Druckkosten-Rechner',
    icon: path.join(__dirname, '..', 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Externe Links im Standardbrowser öffnen, nicht in einem App-Fenster.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

/* ---------------- Start ---------------- */

// Nur eine Instanz: zwei parallel laufende Fenster würden sich beim Schreiben
// in dieselbe Datei gegenseitig überholen.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    dataFolder = readStoredFolder() || app.getPath('userData');
    await loadData();
    startWatching();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // Noch laufende Schreibvorgänge vor dem Beenden abwarten.
  let quitting = false;
  app.on('before-quit', (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    writeQueue.finally(() => app.exit(0));
  });
}
