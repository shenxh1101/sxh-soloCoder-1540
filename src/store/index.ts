import { create } from 'zustand';
import {
  customersApi,
  optometryApi,
  inventoryApi,
  statisticsApi,
} from '../utils/api';
import type {
  Customer,
  OptometryRecord,
  LensInventory,
  FrameInventory,
  InventoryAlert,
  MonthlyStats,
  LensSalesStat,
  InventoryTransaction,
} from '../../shared/types';

interface AppState {
  customers: (Customer & { lastVisit?: string })[];
  optometryRecords: OptometryRecord[];
  lenses: LensInventory[];
  frames: FrameInventory[];
  alerts: InventoryAlert[];
  monthlyStats: (MonthlyStats & { year: string; month: string }) | null;
  lensSalesStats: LensSalesStat[];
  transactions: InventoryTransaction[];
  loading: boolean;
  error: string | null;

  fetchCustomers: (search?: string) => Promise<void>;
  fetchOptometryRecords: (year?: string, month?: string) => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchStatistics: (year?: string, month?: string) => Promise<void>;
  fetchTransactions: (itemType?: string, year?: string, month?: string) => Promise<void>;

  createOptometry: (data: any) => Promise<number>;
  updateOptometry: (id: number, data: Partial<OptometryRecord>) => Promise<void>;
  voidOptometry: (id: number) => Promise<void>;
  restockLens: (id: number, quantity: number) => Promise<void>;
  restockFrame: (id: number, quantity: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  customers: [],
  optometryRecords: [],
  lenses: [],
  frames: [],
  alerts: [],
  monthlyStats: null,
  lensSalesStats: [],
  transactions: [],
  loading: false,
  error: null,

  fetchCustomers: async (search) => {
    set({ loading: true, error: null });
    try {
      const data = await customersApi.list(search);
      set({ customers: data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchOptometryRecords: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const data = await optometryApi.list(year, month);
      set({ optometryRecords: data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchInventory: async () => {
    set({ loading: true, error: null });
    try {
      const [lenses, frames] = await Promise.all([
        inventoryApi.lenses(),
        inventoryApi.frames(),
      ]);
      set({ lenses, frames });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchAlerts: async () => {
    try {
      const data = await inventoryApi.alerts();
      set({ alerts: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchStatistics: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const [monthly, lensSales] = await Promise.all([
        statisticsApi.monthly(year, month),
        statisticsApi.lensSales(year, month),
      ]);
      set({ monthlyStats: monthly, lensSalesStats: lensSales });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTransactions: async (itemType, year, month) => {
    set({ loading: true, error: null });
    try {
      const data = await inventoryApi.transactions(itemType, year, month);
      set({ transactions: data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  createOptometry: async (data) => {
    const result = await optometryApi.create(data);
    await Promise.all([get().fetchInventory(), get().fetchAlerts()]);
    return result.id;
  },

  updateOptometry: async (id, data) => {
    await optometryApi.update(id, data);
    await get().fetchOptometryRecords();
  },

  voidOptometry: async (id) => {
    await optometryApi.void(id);
    await Promise.all([get().fetchOptometryRecords(), get().fetchInventory(), get().fetchAlerts()]);
  },

  restockLens: async (id, quantity) => {
    await inventoryApi.restockLens(id, quantity);
    await Promise.all([get().fetchInventory(), get().fetchAlerts()]);
  },

  restockFrame: async (id, quantity) => {
    await inventoryApi.restockFrame(id, quantity);
    await Promise.all([get().fetchInventory(), get().fetchAlerts()]);
  },
}));
