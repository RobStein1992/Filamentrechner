/**
 * Brücke zwischen Electron-Hauptprozess und der Web-App.
 *
 * Die App selbst bleibt unverändert: Sie ruft window.storage.* auf und
 * bekommt hier die Datei-Variante. Im Browser greifen dieselben Aufrufe ins
 * Leere und die App fällt automatisch auf den lokalen Browser-Speicher
 * zurück.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
  platform: process.platform,
  // Meldet sich, wenn ein anderes Gerät die Datei im Cloud-Ordner geändert hat.
  onStorageChanged: (callback) => {
    ipcRenderer.on('storage-changed', () => {
      try { callback(); } catch (err) {}
    });
  }
});

contextBridge.exposeInMainWorld('storage', {
  get: (key) => ipcRenderer.invoke('storage:get', key),
  set: (key, value) => ipcRenderer.invoke('storage:set', key, value),
  getInfo: () => ipcRenderer.invoke('storage:getInfo'),
  chooseFolder: () => ipcRenderer.invoke('storage:chooseFolder'),
  openFolder: () => ipcRenderer.invoke('storage:openFolder')
});
