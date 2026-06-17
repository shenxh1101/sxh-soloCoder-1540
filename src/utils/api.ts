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

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const customersApi = {
  list: (search?: string) =>
    request<(Customer & { lastVisit?: string })[]>(
      `/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`
    ),
  get: (id: number) =>
    request<CustomerDetailResponse>(`/customers/${id}`),
  getFollowUps: (id: number) =>
    request<FollowUpRecord[]>(`/customers/${id}/follow-ups`),
  addFollowUp: (id: number, data: { type: 'phone' | 'visit' | 'other'; result: string; notes?: string }) =>
    request<FollowUpRecord>(`/customers/${id}/follow-ups`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getDueForReview: () =>
    request<(Customer & { lastVisit: string; nextReviewDate: string; daysUntilReview: number })[]>(
      '/customers/due-for-review'
    ),
  getReviewTodo: () =>
    request<(Customer & {
      lastVisit: string;
      nextReviewDate: string;
      daysUntilReview: number;
      status: 'overdue' | 'upcoming' | 'followed_up' | 'normal';
      lastFollowUp: string | null;
      hasFollowUpNotVisited: boolean;
    })[]>(
      '/customers/review-todo'
    ),
  create: (name: string, phone: string) =>
    request<Customer & { isNew?: boolean }>('/customers', {
      method: 'POST',
      body: JSON.stringify({ name, phone }),
    }),
};

export const optometryApi = {
  list: (year?: string, month?: string, includeVoided?: boolean) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    if (includeVoided) params.set('includeVoided', 'true');
    return request<OptometryRecord[]>(
      `/optometry${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  get: (id: number) => request<OptometryRecord>(`/optometry/${id}`),
  create: (data: {
    customerName: string;
    customerPhone: string;
    leftSphere: number;
    leftCylinder?: number;
    leftAxis?: number;
    rightSphere: number;
    rightCylinder?: number;
    rightAxis?: number;
    pd: number;
    lensId: number;
    frameId: number;
    price?: number;
  }) =>
    request<{ id: number; success: boolean }>('/optometry', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<OptometryRecord>) =>
    request<OptometryRecord>(`/optometry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  void: (id: number) =>
    request<{ id: number; success: boolean }>(`/optometry/${id}/void`, {
      method: 'POST',
    }),
};

export const inventoryApi = {
  lenses: () => request<LensInventory[]>('/inventory/lenses'),
  restockLens: (id: number, quantity: number) =>
    request<LensInventory>(`/inventory/lenses/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),
  updateLens: (id: number, data: Partial<LensInventory>) =>
    request<LensInventory>(`/inventory/lenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  frames: () => request<FrameInventory[]>('/inventory/frames'),
  restockFrame: (id: number, quantity: number) =>
    request<FrameInventory>(`/inventory/frames/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
    }),
  updateFrame: (id: number, data: Partial<FrameInventory>) =>
    request<FrameInventory>(`/inventory/frames/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  alerts: () => request<InventoryAlert[]>('/inventory/alerts'),
  suppliers: () => request<Supplier[]>('/inventory/suppliers'),
  createSupplier: (data: Partial<Supplier>) =>
    request<Supplier>('/inventory/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: number, data: Partial<Supplier>) =>
    request<Supplier>(`/inventory/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  transactions: (itemType?: string, year?: string, month?: string) => {
    const params = new URLSearchParams();
    if (itemType) params.set('itemType', itemType);
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return request<InventoryTransaction[]>(
      `/inventory/transactions${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  purchaseOrders: (status?: string, paymentStatus?: string) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    return request<PurchaseOrder[]>(
      `/inventory/purchase-orders${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  createPurchaseOrder: (data: {
    items: { itemType: 'lens' | 'frame'; itemId: number; quantity: number }[];
    supplierId?: number;
    orderDate?: string;
  }) =>
    request<PurchaseOrder>('/inventory/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePurchaseOrder: (id: number, data: Partial<PurchaseOrder>) =>
    request<PurchaseOrder>(`/inventory/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  completePurchaseOrder: (id: number) =>
    request<{ id: number; success: boolean; message: string }>(`/inventory/purchase-orders/${id}/complete`, {
      method: 'POST',
    }),
};

export const statisticsApi = {
  monthly: (year?: string, month?: string) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return request<MonthlyStats & { year: string; month: string }>(
      `/statistics/monthly${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  lensSales: (year?: string, month?: string) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return request<LensSalesStat[]>(
      `/statistics/lenses${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
  reconciliation: (year?: string, month?: string) => {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return request<any>(
      `/statistics/reconciliation${params.toString() ? `?${params.toString()}` : ''}`
    );
  },
};
