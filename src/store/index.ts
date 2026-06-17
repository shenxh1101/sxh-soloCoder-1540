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
  FollowUpRecord,
  PurchaseOrder,
  CustomerDetailResponse,
  Supplier,
} from '../../shared/types';

interface AppState {
  customers: (Customer & { lastVisit?: string })[];
  customerDetail: CustomerDetailResponse | null;
  optometryRecords: OptometryRecord[];
  lenses: LensInventory[];
  frames: FrameInventory[];
  alerts: InventoryAlert[];
  suppliers: Supplier[];
  monthlyStats: (MonthlyStats & { year: string; month: string }) | null;
  lensSalesStats: LensSalesStat[];
  transactions: InventoryTransaction[];
  purchaseOrders: PurchaseOrder[];
  reviewTodo: any[];
  reviewConversion: any | null;
  reconciliation: any | null;
  loading: boolean;
  error: string | null;

  fetchCustomers: (search?: string) => Promise<void>;
  fetchCustomerDetail: (id: number) => Promise<void>;
  fetchOptometryRecords: (year?: string, month?: string, includeVoided?: boolean) => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier>;
  updateSupplier: (id: number, data: Partial<Supplier>) => Promise<Supplier>;
  fetchStatistics: (year?: string, month?: string) => Promise<void>;
  fetchReconciliation: (year?: string, month?: string) => Promise<void>;
  fetchTransactions: (itemType?: string, year?: string, month?: string) => Promise<void>;
  fetchPurchaseOrders: (status?: string, paymentStatus?: string) => Promise<void>;
  fetchReviewTodo: () => Promise<void>;
  fetchReviewConversion: (year?: string, month?: string) => Promise<void>;

  createOptometry: (data: any) => Promise<number>;
  updateOptometry: (id: number, data: Partial<OptometryRecord>) => Promise<void>;
  voidOptometry: (id: number) => Promise<void>;
  restockLens: (id: number, quantity: number) => Promise<void>;
  restockFrame: (id: number, quantity: number) => Promise<void>;
  addFollowUp: (customerId: number, data: { type: 'phone' | 'visit' | 'other'; result: string; notes?: string }) => Promise<FollowUpRecord>;
  createPurchaseOrder: (data: {
    items: { itemType: 'lens' | 'frame'; itemId: number; quantity: number }[];
    supplierId?: number;
    orderDate?: string;
  }) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (id: number, data: Partial<PurchaseOrder> & { clearSupplier?: boolean }) => Promise<PurchaseOrder>;
  completePurchaseOrder: (id: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  customers: [],
  customerDetail: null,
  optometryRecords: [],
  lenses: [],
  frames: [],
  alerts: [],
  suppliers: [],
  monthlyStats: null,
  lensSalesStats: [],
  transactions: [],
  purchaseOrders: [],
  reviewTodo: [],
  reviewConversion: null as any,
  reconciliation: null,
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

  fetchCustomerDetail: async (id) => {
    set({ loading: true, error: null });
    try {
      const data = await customersApi.get(id);
      set({ customerDetail: data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  fetchOptometryRecords: async (year, month, includeVoided) => {
    set({ loading: true, error: null });
    try {
      const data = await optometryApi.list(year, month, includeVoided);
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

  fetchSuppliers: async () => {
    try {
      const data = await inventoryApi.suppliers();
      set({ suppliers: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  createSupplier: async (data) => {
    const result = await inventoryApi.createSupplier(data);
    await get().fetchSuppliers();
    return result;
  },

  updateSupplier: async (id, data) => {
    const result = await inventoryApi.updateSupplier(id, data);
    await get().fetchSuppliers();
    return result;
  },

  fetchReviewTodo: async () => {
    try {
      const data = await customersApi.getReviewTodo();
      set({ reviewTodo: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchReviewConversion: async (year, month) => {
    try {
      const data = await customersApi.getReviewConversion(year, month);
      set({ reviewConversion: data });
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

  fetchReconciliation: async (year, month) => {
    set({ loading: true, error: null });
    try {
      const data = await statisticsApi.reconciliation(year, month);
      set({ reconciliation: data });
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

  addFollowUp: async (customerId, data) => {
    const result = await customersApi.addFollowUp(customerId, data);
    if (get().customerDetail?.customer.id === customerId) {
      await get().fetchCustomerDetail(customerId);
    }
    return result;
  },

  fetchPurchaseOrders: async (status, paymentStatus) => {
    set({ loading: true, error: null });
    try {
      const data = await inventoryApi.purchaseOrders(status, paymentStatus);
      set({ purchaseOrders: data });
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  createPurchaseOrder: async (data) => {
    const result = await inventoryApi.createPurchaseOrder(data);
    await get().fetchPurchaseOrders();
    return result;
  },

  updatePurchaseOrder: async (id, data) => {
    const result = await inventoryApi.updatePurchaseOrder(id, data);
    await get().fetchPurchaseOrders();
    return result;
  },

  completePurchaseOrder: async (id) => {
    await inventoryApi.completePurchaseOrder(id);
    await Promise.all([
      get().fetchPurchaseOrders(),
      get().fetchInventory(),
      get().fetchAlerts(),
      get().fetchTransactions(),
    ]);
  },
}));
