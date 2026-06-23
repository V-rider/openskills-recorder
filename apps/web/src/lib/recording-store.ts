"use client";

import type { RawRecordingEvent } from "@openskills/core";
import { create } from "zustand";

interface RecordingStore {
  recordingId: string | null;
  events: RawRecordingEvent[];
  isRecording: boolean;
  setRecordingId: (id: string | null) => void;
  addEvent: (event: RawRecordingEvent) => void;
  setEvents: (events: RawRecordingEvent[]) => void;
  setIsRecording: (v: boolean) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  recordingId: null,
  events: [],
  isRecording: false,
  setRecordingId: (id) => set({ recordingId: id }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setEvents: (events) => set({ events }),
  setIsRecording: (isRecording) => set({ isRecording }),
  reset: () => set({ recordingId: null, events: [], isRecording: false }),
}));
