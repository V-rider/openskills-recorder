import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("openskills", {
  recorder: {
    start: (input: unknown) => ipcRenderer.invoke("recorder:start", input),
    stop: (recordingId: string) => ipcRenderer.invoke("recorder:stop", recordingId),
  },
  synthesis: {
    run: (payload: { recordingId: string; useLlm?: boolean }) =>
      ipcRenderer.invoke("synthesis:run", payload),
  },
  replay: {
    run: (input: unknown) => ipcRenderer.invoke("replay:run", input),
    cancel: (runId: string) => ipcRenderer.invoke("replay:cancel", runId),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    save: (data: unknown) => ipcRenderer.invoke("settings:save", data),
  },
  dialog: {
    permission: () => ipcRenderer.invoke("dialog:permission"),
  },
  wsPort: 3847,
});
