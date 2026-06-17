export interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptometryRecord {
  id: number;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  leftSphere: number;
  leftCylinder: number;
  leftAxis: number;
  rightSphere: number;
  rightCylinder: number;
  rightAxis: number;
  pd: number;
  lensId: number;
  lensName?: string;
  refractiveIndex?: string;
  frameId: number;
  frameBrand?: string;
  frameModel?: string;
  price: number;
  createdAt: string;
}

export interface LensInventory {
  id: number;
  refractiveIndex: '1.56' | '1.60' | '1.67';
  name: string;
  stock: number;
  safetyStock: number;
  costPrice: number;
  sellingPrice: number;
}

export interface FrameInventory {
  id: number;
  brand: string;
  model: string;
  stock: number;
  safetyStock: number;
  costPrice: number;
  sellingPrice: number;
}

export interface InventoryAlert {
  type: 'lens' | 'frame';
  id: number;
  name: string;
  stock: number;
  safetyStock: number;
}

export interface MonthlyStats {
  totalOrders: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface LensSalesStat {
  refractiveIndex: string;
  count: number;
  revenue: number;
}
