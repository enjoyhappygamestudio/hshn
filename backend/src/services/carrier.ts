import { config } from '../config';

export interface CarrierFeeRequest {
  fromLat?: number;
  fromLng?: number;
  toLat: number;
  toLng: number;
  weight: number;
  cod?: number;
}

export interface CarrierFeeResult {
  fee: number;
  estimatedDays: number;
  serviceName: string;
  carrier: string;
}

export interface CarrierOrderRequest {
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  toLat: number;
  toLng: number;
  fromLat?: number;
  fromLng?: number;
  items: { name: string; quantity: number; weight: number; price?: number }[];
  cod: number;
  note?: string;
  orderTime?: number;
}

export interface CarrierOrderResult {
  trackingCode: string;
  fee: number;
  estimatedDelivery: string;
}

export interface TrackPoint {
  lat: number;
  lng: number;
}

export interface CarrierTrackResult {
  status: string;
  statusText: string;
  currentLat?: number;
  currentLng?: number;
  timeline: { time: string; status: string }[];
  pickup?: TrackPoint & { address?: string; name?: string };
  delivery?: TrackPoint & { address?: string; name?: string };
  route?: TrackPoint[];
  driver?: { id?: string; name?: string; phone?: string; rating?: number } | null;
  accept?: TrackPoint & { time?: number } | null;
  shareLink?: string;
  trackingCode?: string;
  distanceKm?: number;
  durationSec?: number;
  timestamps?: { accepted?: number; boarded?: number; pickedUp?: number; completed?: number };
}

interface CarrierService {
  name: string;
  enabled: boolean;
  calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult>;
  createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult>;
  trackOrder(trackingCode: string): Promise<CarrierTrackResult>;
  cancelOrder?(trackingCode: string, reason: string): Promise<void>;
}

class GHNCarrier implements CarrierService {
  name = 'GHN';
  enabled = config.shipping.ghn.enabled;
  private apiUrl = config.shipping.ghn.apiUrl;
  private token = config.shipping.ghn.token;

  private async call(method: string, path: string, body?: any): Promise<any> {
    if (!this.token) throw new Error('GHN chưa được cấu hình API key');
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Token': this.token },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any = await res.json();
    if (data.code !== 200) throw new Error(data.message || 'GHN API error');
    return data.data;
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('POST', '/v2/calculate-fee', {
      from_district_id: req.fromLat ? undefined : undefined,
      service_type_id: 2,
      to_district_id: undefined,
      to_ward_code: undefined,
      weight: Math.max(500, req.weight * 1000),
      insurance_value: req.cod || 0,
    });
    return { fee: data.total, estimatedDays: data.expected_delivery_days || 1, serviceName: 'Chuẩn', carrier: 'GHN' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const data = await this.call('POST', '/v2/create-order', {
      to_name: req.customerName,
      to_phone: req.customerPhone,
      to_address: req.customerAddress,
      cod_amount: req.cod,
      weight: Math.max(500, req.items.reduce((s, i) => s + i.quantity * i.weight, 0) * 1000),
      note: req.note || '',
      service_type_id: 2,
      required_note: 'CHOXEMHANGKHONGTHU',
    });
    return { trackingCode: data.order_code, fee: data.total_fee || 0, estimatedDelivery: data.expected_delivery_time || '' };
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('POST', '/v2/order-detail', { order_code: trackingCode });
    const statusMap: Record<string, string> = {
      'ready_to_pick': 'Chờ lấy hàng', 'picking': 'Đang lấy', 'storing': 'Tại kho',
      'delivering': 'Đang giao', 'delivered': 'Đã giao', 'return': 'Hoàn hàng',
    };
    return {
      status: data.status,
      statusText: statusMap[data.status] || data.status,
      timeline: (data.logs || []).map((l: any) => ({ time: l.updated_date || '', status: l.status || '' })),
    };
  }
}

class GHTKCarrier implements CarrierService {
  name = 'GHTK';
  enabled = config.shipping.ghtk.enabled;
  private apiUrl = config.shipping.ghtk.apiUrl;
  private token = config.shipping.ghtk.token;

  private async call(method: string, path: string, body?: any): Promise<any> {
    if (!this.token) throw new Error('GHTK chưa được cấu hình API key');
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Token': this.token },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any = await res.json();
    if (!data.success) throw new Error(data.message || 'GHTK API error');
    return data.data || data;
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('GET', `/services/shipment/fee?weight=${Math.max(500, req.weight * 1000)}`);
    return { fee: data.fee?.ship || data.ship_fee || 30000, estimatedDays: 1, serviceName: 'Tiết kiệm', carrier: 'GHTK' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const data = await this.call('POST', '/services/shipment/order', {
      products: req.items.map(i => ({ name: i.name, quantity: i.quantity, weight: i.weight })),
      order: {
        name: req.customerName, phone: req.customerPhone, address: req.customerAddress,
        pick_money: req.cod, note: req.note || '',
      },
    });
    return { trackingCode: data.order_code || data.order_id || '', fee: data.fee || 0, estimatedDelivery: '' };
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('GET', `/services/shipment/v2/${trackingCode}`);
    return { status: data.status || '', statusText: data.status_text || '', timeline: [] };
  }
}

class ViettelCarrier implements CarrierService {
  name = 'ViettelPost';
  enabled = config.shipping.viettel.enabled;
  private apiUrl = config.shipping.viettel.apiUrl;
  private token = config.shipping.viettel.token;

  private async call(method: string, path: string, body?: any): Promise<any> {
    if (!this.token) throw new Error('ViettelPost chưa được cấu hình API key');
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any = await res.json();
    if (!data.success) throw new Error(data.message || 'ViettelPost API error');
    return data.data || data;
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('POST', '/order/getPrice', {
      sender_province: 'HN', receiver_province: 'HN',
      product_weight: Math.max(500, req.weight * 1000),
      money_total: req.cod || 0,
    });
    return { fee: data.price || data.total || 30000, estimatedDays: 1, serviceName: 'Thường', carrier: 'ViettelPost' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const data = await this.call('POST', '/order/create', {
      receiver_name: req.customerName, receiver_phone: req.customerPhone,
      receiver_address: req.customerAddress, cod: req.cod,
      product_name: req.items.map(i => i.name).join(', '),
      product_weight: req.items.reduce((s, i) => s + i.quantity * i.weight, 0) * 1000,
      note: req.note || '',
    });
    return { trackingCode: data.order_number || data.order_id || '', fee: data.total_fee || 0, estimatedDelivery: '' };
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('GET', `/order/getToken?order_code=${trackingCode}`);
    return { status: data.status || '', statusText: data.status_text || '', timeline: [] };
  }
}

class AhaMoveCarrier implements CarrierService {
  name = 'AhaMove';
  enabled = config.shipping.ahamove.enabled;
  private apiUrl = config.shipping.ahamove.apiUrl;
  private apiKey = config.shipping.ahamove.token;
  private mobile = config.shipping.ahamove.mobile;
  private shopName = config.shipping.ahamove.shopName;
  private shopPhone = config.shipping.ahamove.shopPhone;
  private shopAddress = config.shipping.ahamove.shopAddress;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;
    if (!this.apiKey) throw new Error('AhaMove chưa được cấu hình API key');
    if (!this.mobile) throw new Error('AhaMove chưa được cấu hình số điện thoại tài khoản');
    const reqBody = { api_key: this.apiKey, mobile: this.mobile };
    console.log('[AhaMove] POST /v3/accounts/token body=', JSON.stringify(reqBody));
    const res = await fetch(`${this.apiUrl}/v3/accounts/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    const text = await res.text();
    console.log(`[AhaMove] POST /v3/accounts/token status=${res.status} res=${text}`);
    const data: any = JSON.parse(text || '{}');
    if (data?.code) throw new Error(data.description || data.title || data.internal || 'AhaMove xác thực thất bại');
    if (!data?.token) throw new Error('AhaMove xác thực thất bại');
    this.accessToken = data.token;
    this.tokenExpiry = Date.now() + 12 * 60 * 60 * 1000;
    return data.token;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/^0/, '84').replace(/[^0-9]/g, '');
  }

  private async call(method: string, path: string, body?: any): Promise<any> {
    const doRequest = async (token: string): Promise<{ status: number; text: string }> => {
      const res = await fetch(`${this.apiUrl}/v3${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, text };
    };

    console.log(`[AhaMove] ${method} /v3${path} body=${body ? JSON.stringify(body) : 'N/A'}`);
    let { status, text } = await doRequest(await this.getToken());
    let data: any = JSON.parse(text || '{}');
    if (data?.code === 'NOT_AUTHORIZED') {
      console.log(`[AhaMove] ${method} /v3${path} NOT_AUTHORIZED → refresh token`);
      this.accessToken = null;
      this.tokenExpiry = 0;
      ({ status, text } = await doRequest(await this.getToken()));
      data = JSON.parse(text || '{}');
    }
    console.log(`[AhaMove] ${method} /v3${path} status=${status} res=${text}`);
    if (data?.code) throw new Error(data.description || data.title || data.internal || 'AhaMove API error');
    return data;
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('POST', '/orders/estimates', {
      order_time: 0,
      path: [
        { lat: req.fromLat || config.shipping.ahamove.shopLat, lng: req.fromLng || config.shipping.ahamove.shopLng, address: this.shopAddress, name: this.shopName, mobile: this.normalizePhone(this.shopPhone) },
        { lat: req.toLat, lng: req.toLng, address: 'Địa chỉ giao hàng', name: 'Khách', mobile: '84981230001' },
      ],
      group_services: [{ _id: 'BIKE', group_requests: [] }, { _id: 'ECO', group_requests: [] }],
      payment_method: 'CASH',
      items: [{ _id: 'GOODS', num: 1, name: 'Hàng hóa', price: req.cod || 0 }],
      package_detail: [{ weight: Math.max(0.5, req.weight) }],
    });
    const estimate = Array.isArray(data) ? data.find((s: any) => s.data?.total_fee && !s.error) : null;
    const fee = estimate?.data?.total_fee || estimate?.data?.total_price || 0;
    return { fee, estimatedDays: 1, serviceName: estimate?.service_id || 'BIKE', carrier: 'AhaMove' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const weight = Math.max(0.5, req.items.reduce((s, i) => s + i.quantity * i.weight, 0));
    const data = await this.call('POST', '/orders', {
      order_time: req.orderTime || 0,
      path: [
        {
          lat: req.fromLat || config.shipping.ahamove.shopLat,
          lng: req.fromLng || config.shipping.ahamove.shopLng,
          address: this.shopAddress,
          name: this.shopName,
          mobile: this.normalizePhone(this.shopPhone),
          remarks: 'Lấy hàng',
        },
        {
          lat: req.toLat,
          lng: req.toLng,
          address: req.customerAddress,
          name: req.customerName,
          mobile: this.normalizePhone(req.customerPhone),
          cod: req.cod || 0,
          tracking_number: `ORDER-${Date.now()}`,
          remarks: req.note || '',
        },
      ],
      group_service_id: 'BIKE',
      group_requests: [],
      payment_method: 'CASH',
      items: req.items.map((i, idx) => ({
        _id: `ITEM-${idx}`,
        num: i.quantity,
        name: i.name,
        price: i.price || 0,
      })),
      package_detail: [{ weight, description: 'Hải sản' }],
    });
    return { trackingCode: data.order_id || data.order?._id || '', fee: data.order?.total_pay || data.total_pay || 0, estimatedDelivery: '' };
  }

  async cancelOrder(trackingCode: string, reason: string): Promise<void> {
    await this.call('DELETE', `/orders/${trackingCode}`, { comment: reason || 'Khách hàng muốn hủy đơn' });
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('GET', `/orders/${trackingCode}`);
    const statusMap: Record<string, string> = {
      'ASSIGNING': 'Đang tìm tài xế', 'ACCEPTED': 'Đã nhận đơn', 'IN PROCESS': 'Đang giao',
      'COMPLETED': 'Đã giao', 'CANCELLED': 'Đã hủy', 'IDLE': 'Chờ xử lý',
    };
    const path = data.path || [];
    const pickupStop = path.find((p: any) => p.action_type === 'PICK UP');
    const deliveryStop = path.find((p: any) => p.action_type === 'DROP OFF');
    const currentStop = path.find((p: any) => p.status === 'IN PROCESS');
    const hasDriver = !!(data.supplier_id || data.supplier_name);
    const driverLoc = data.accept_lat != null && data.accept_lng != null
      ? { lat: data.accept_lat, lng: data.accept_lng }
      : currentStop && currentStop.lat != null
        ? { lat: currentStop.lat, lng: currentStop.lng }
        : null;
    const currentLat = hasDriver ? (driverLoc?.lat ?? data.accept_lat) : undefined;
    const currentLng = hasDriver ? (driverLoc?.lng ?? data.accept_lng) : undefined;
    return {
      status: data.status || '',
      statusText: statusMap[data.status] || data.status || '',
      currentLat,
      currentLng,
      pickup: pickupStop ? { lat: pickupStop.lat, lng: pickupStop.lng, address: pickupStop.address, name: pickupStop.name } : undefined,
      delivery: deliveryStop ? { lat: deliveryStop.lat, lng: deliveryStop.lng, address: deliveryStop.address, name: deliveryStop.name } : undefined,
      route: data.polylines ? decodePolyline(data.polylines) : path.map((p: any) => ({ lat: p.lat, lng: p.lng })),
      driver: hasDriver
        ? {
            id: data.supplier_id || undefined,
            name: data.supplier_name || 'Tài xế',
            phone: data.supplier_phone || undefined,
            rating: data.supplier_rating != null ? Number(data.supplier_rating) : undefined,
          }
        : null,
      accept: driverLoc ? { ...driverLoc, time: data.accept_time || undefined } : null,
      shareLink: data.share_link || undefined,
      trackingCode: data.tracking_code || data._id || undefined,
      distanceKm: data.distance || undefined,
      durationSec: data.duration || undefined,
      timestamps: {
        accepted: data.accept_time || undefined,
        boarded: data.board_time || undefined,
        pickedUp: data.pickup_time || undefined,
        completed: data.complete_time || undefined,
      },
      timeline: path.map((p: any) => ({
        time: p.complete_time ? new Date(p.complete_time * 1000).toISOString() : '',
        status: p.status || '',
      })).filter((t: any) => t.time || t.status),
    };
  }
}

function decodePolyline(encoded: string): TrackPoint[] {
  const points: TrackPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

class GrabCarrier implements CarrierService {
  name = 'Grab';
  enabled = config.shipping.grab.enabled;
  private apiUrl = config.shipping.grab.apiUrl;
  private token = config.shipping.grab.token;

  private async call(method: string, path: string, body?: any): Promise<any> {
    if (!this.token) throw new Error('Grab chưa được cấu hình API key');
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('POST', '/v2/delivery/quotations', {
      service: 'express',
      pickup: { address: 'Shop', latitude: req.fromLat || 21.0285, longitude: req.fromLng || 105.8542 },
      dropoff: { address: 'Khách', latitude: req.toLat, longitude: req.toLng },
      packages: [{ name: 'Hàng hóa', weight: Math.max(0.5, req.weight) * 1000 }],
    });
    return { fee: data.amount || data.totalPrice || data.total_amount || 30000, estimatedDays: 1, serviceName: 'Express', carrier: 'Grab' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const data = await this.call('POST', '/v2/delivery/orders', {
      service: 'express',
      pickup: { address: req.customerAddress, name: req.customerName, phone: req.customerPhone, latitude: req.fromLat || 21.0285, longitude: req.fromLng || 105.8542 },
      dropoff: { address: req.customerAddress, name: req.customerName, phone: req.customerPhone, latitude: req.toLat, longitude: req.toLng },
      packages: req.items.map(i => ({ name: i.name, weight: i.quantity * i.weight * 1000 })),
      cashOnDelivery: req.cod || 0,
    });
    return { trackingCode: data.orderID || data._id || '', fee: data.totalPrice || 0, estimatedDelivery: data.estimatedDeliveryTime || '' };
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('GET', `/v2/delivery/orders/${trackingCode}`);
    return { status: data.status || '', statusText: data.statusText || data.status || '', timeline: [] };
  }
}

class BeeCarrier implements CarrierService {
  name = 'Bee';
  enabled = config.shipping.bee.enabled;
  private apiUrl = config.shipping.bee.apiUrl;
  private token = config.shipping.bee.token;

  private async call(method: string, path: string, body?: any): Promise<any> {
    if (!this.token) throw new Error('Bee chưa được cấu hình API key');
    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  }

  async calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult> {
    const data = await this.call('POST', '/delivery/quote', {
      pickup_lat: req.fromLat || 21.0285, pickup_lng: req.fromLng || 105.8542,
      dropoff_lat: req.toLat, dropoff_lng: req.toLng,
      weight: Math.max(0.5, req.weight),
    });
    return { fee: data.fee || data.total || 30000, estimatedDays: 1, serviceName: 'Delivery', carrier: 'Bee' };
  }

  async createOrder(req: CarrierOrderRequest): Promise<CarrierOrderResult> {
    const data = await this.call('POST', '/delivery/order', {
      pickup: { lat: req.fromLat || 21.0285, lng: req.fromLng || 105.8542, address: req.customerAddress, name: req.customerName, phone: req.customerPhone },
      dropoff: { lat: req.toLat, lng: req.toLng, address: req.customerAddress, name: req.customerName, phone: req.customerPhone },
      cod: req.cod || 0,
      items: req.items.map(i => ({ name: i.name, quantity: i.quantity })),
    });
    return { trackingCode: data.order_id || data.id || '', fee: data.fee || 0, estimatedDelivery: '' };
  }

  async trackOrder(trackingCode: string): Promise<CarrierTrackResult> {
    const data = await this.call('GET', `/delivery/order/${trackingCode}`);
    return { status: data.status || '', statusText: data.status_text || data.status || '', timeline: [] };
  }
}

const carriers: CarrierService[] = [
  new GHNCarrier(),
  new GHTKCarrier(),
  new ViettelCarrier(),
  new AhaMoveCarrier(),
  new GrabCarrier(),
  new BeeCarrier(),
];

export function getActiveCarriers(): CarrierService[] {
  return carriers.filter(c => c.enabled);
}

// Danh sách tất cả carriers đã đăng ký (kể cả bị tắt) — dùng để ẩn partner theo GRAB_ENABLED...
export function getAllCarriers(): CarrierService[] {
  return carriers;
}

export async function calculateFee(req: CarrierFeeRequest): Promise<CarrierFeeResult[]> {
  const active = getActiveCarriers();
  if (active.length === 0) return [];
  return Promise.all(active.map(c => c.calculateFee(req)));
}

export async function createShipOrder(carrierName: string, req: CarrierOrderRequest): Promise<CarrierOrderResult> {
  const carrier = carriers.find(c => c.name === carrierName && c.enabled);
  if (!carrier) throw new Error(`Đối tác ${carrierName} chưa được kích hoạt`);
  return carrier.createOrder(req);
}

export async function trackShipOrder(carrierName: string, trackingCode: string): Promise<CarrierTrackResult> {
  const carrier = carriers.find(c => c.name === carrierName);
  if (!carrier) throw new Error(`Không tìm thấy đối tác ${carrierName}`);
  return carrier.trackOrder(trackingCode);
}

export async function cancelShipOrder(carrierName: string, trackingCode: string, reason: string): Promise<void> {
  const carrier = carriers.find(c => c.name === carrierName);
  if (!carrier) throw new Error(`Không tìm thấy đối tác ${carrierName}`);
  if (!carrier.cancelOrder) throw new Error(`Đối tác ${carrierName} không hỗ trợ hủy đơn`);
  await carrier.cancelOrder(trackingCode, reason);
}
