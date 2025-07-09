const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getQuestions: () => ipcRenderer.invoke('getQuestions'),
  getTimeLeft: () => ipcRenderer.invoke('getTimeLeft'),
  getQuestionSolved: () => ipcRenderer.invoke('getQuestionSolved'),
  unblock: () => ipcRenderer.invoke('unblock'),
  block: () => ipcRenderer.invoke('block'),
  reset: () => ipcRenderer.invoke('reset'),
});
