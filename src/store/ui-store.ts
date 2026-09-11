import { create } from "zustand";

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

interface Modal {
  id: string;
  type: "confirm" | "form" | "custom";
  title: string;
  content?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Modals
  modals: Modal[];
  openModal: (modal: Omit<Modal, "id">) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Mobile navigation
  bottomNavVisible: boolean;
  setBottomNavVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    // Auto remove
    setTimeout(() => {
      get().removeToast(id);
    }, toast.duration ?? 5000);
    return id;
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),

  // Modals
  modals: [],
  openModal: (modal) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newModal = { ...modal, id };
    set((state) => ({ modals: [...state.modals, newModal] }));
    return id;
  },
  closeModal: (id) => set((state) => ({ modals: state.modals.filter((m) => m.id !== id) })),
  closeAllModals: () => set({ modals: [] }),

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Bottom nav
  bottomNavVisible: true,
  setBottomNavVisible: (visible) => set({ bottomNavVisible: visible }),
}));

// Helper functions for common toasts
export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: "success", title, message }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: "error", title, message }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: "warning", title, message }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: "info", title, message }),
};

// Helper for confirm modal
export const confirm = (
  title: string,
  content: React.ReactNode,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  return useUIStore.getState().openModal({
    type: "confirm",
    title,
    content,
    onConfirm,
    onCancel,
    confirmText: "Ya",
    cancelText: "Batal",
  });
};