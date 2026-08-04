import { query } from '../utils/db';
import { createShipOrder, getActiveCarriers } from './carrier';

// Tạo đơn vận chuyển THẬT (AhaMove) cho đơn hàng khi admin xác nhận đủ hàng.
// Chỉ chạy khi đơn có chọn đối tác vận chuyển đang kích hoạt.
export async function createShippingForOrder(orderId: string): Promise<void> {
  const result = await query(`
    SELECT o.*, p.name as partner_name
    FROM orders o
    LEFT JOIN shipping_partners p ON o.shipping_partner_id = p.id
    WHERE o.id = $1
  `, [orderId]);

  const order = result.rows[0];
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  if (order.shipping_tracking_code) return;

  const partnerName: string | null = order.partner_name || null;
  if (!partnerName || !getActiveCarriers().some(c => c.name === partnerName)) return;

  const snapshot = order.address_snapshot || {};
  const items = order.items || [];
  const shipItems = items.map((i: any) => ({
    name: i.name || 'Hải sản',
    quantity: i.quantity || 1,
    weight: i.weight || 1,
    price: i.price || 0,
  }));
  const goodsValue = Math.max(0, (order.subtotal || 0) - (order.discount || 0));
  const cod = order.payment_method === 'cod' ? goodsValue : 0;
  const orderTime = computeOrderTime(order);

  const buildRequest = (codAmount: number) => ({
    customerName: snapshot.name || 'Khách',
    customerPhone: (snapshot.phone || '').toString(),
    customerAddress: snapshot.full || '',
    toLat: Number(snapshot.lat),
    toLng: Number(snapshot.lng),
    items: shipItems,
    cod: codAmount,
    note: order.note || '',
    orderTime,
  });

  const base = buildRequest(cod);
  if (!base.toLat || !base.toLng) {
    throw new Error('Thiếu tọa độ địa chỉ giao hàng — khách cần cập nhật lại địa chỉ trên app');
  }
  if (!/^[0-9]{9,}$/.test(base.customerPhone.replace(/[^0-9]/g, ''))) {
    throw new Error('Thiếu số điện thoại người nhận hợp lệ');
  }

  let shipResult;
  try {
    shipResult = await createShipOrder(partnerName, base);
  } catch (shipErr: any) {
    if (String(shipErr.message || '').toLowerCase().includes('cod')) {
      shipResult = await createShipOrder(partnerName, buildRequest(0));
      await query(
        `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping', $2)`,
        [orderId, 'AhaMove staging giới hạn COD, đã đặt đơn COD = 0'],
      );
    } else {
      throw shipErr;
    }
  }

  await query(
    `UPDATE orders SET shipping_carrier = $1, shipping_tracking_code = $2, shipping_status = 'created', shipping_carrier_fee = $3, updated_at = NOW()
     WHERE id = $4`,
    [partnerName, shipResult.trackingCode, shipResult.fee, orderId],
  );
  await query(
    `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping_created', $2)`,
    [orderId, `Đã tạo đơn vận chuyển ${partnerName}: ${shipResult.trackingCode}`],
  );
}

// order_time (epoch giây) cho AhaMove: đơn hẹn ngày giờ → mốc giờ bắt đầu khung giờ giao; đơn thường → 0 (giao ngay)
function computeOrderTime(order: any): number {
  if (order.delivery_mode !== 'appointment' || !order.delivery_date) return 0;
  const startHour = parseInt(String(order.delivery_time || '').split('-')[0], 10);
  const hour = isNaN(startHour) ? 8 : startHour;
  const epoch = Date.parse(
    `${order.delivery_date}T${String(hour).padStart(2, '0')}:00:00+07:00`,
  );
  return isNaN(epoch) ? 0 : Math.floor(epoch / 1000);
}
