import { create } from 'zustand';

interface PersonalFilesStore {
  isOpen: boolean;
  fileCount: number;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  setFileCount: (count: number) => void;
}

export const usePersonalFilesStore = create<PersonalFilesStore>((set) => ({
  isOpen: false,
  fileCount: 0,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
  setFileCount: (fileCount) => set({ fileCount }),
}));
