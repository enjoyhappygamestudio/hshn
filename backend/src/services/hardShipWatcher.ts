import { query } from '../utils/db';
import { trackShipOrder } from './carrier';
import { config } from '../config';

// Theo dõi các đơn đã confirmed nhưng quá N phút (cấu hình HARD_SHIP_TIMEOUT_MIN, mặc định 10)
// chưa có tài xế nhận (AhaMove vẫn ASSIGNING) → chuyển trạng thái sang 'hard_to_ship' để cảnh báo admin.

const HARD_SHIP_TIMEOUT_MIN = Math.max(1, config.hardShipTimeoutMin);
const SCAN_INTERVAL_MS = 60_000;

async function scanHardToShipOrders(): Promise<void> {
  try {
    const result = await query(`
      SELECT o.id, o.code, o.shipping_carrier, o.shipping_tracking_code,
             MAX(t.created_at) as confirmed_at
      FROM orders o
      JOIN order_tracking t ON t.order_id = o.id AND t.status = 'confirmed'
      WHERE o.status = 'confirmed'
        AND o.shipping_carrier IS NOT NULL
        AND o.shipping_tracking_code IS NOT NULL
      GROUP BY o.id, o.code, o.shipping_carrier, o.shipping_tracking_code
      HAVING MAX(t.created_at) <= NOW() - INTERVAL '${HARD_SHIP_TIMEOUT_MIN} minutes'
    `);

    for (const order of result.rows) {
      try {
        const live = await trackShipOrder(order.shipping_carrier, order.shipping_tracking_code);
        const stillSearching = !live.driver || ['ASSIGNING', 'IDLE', 'CONFIRMING', 'PAYING'].includes(live.status || '');
        if (!stillSearching) continue;

        await query(
          `UPDATE orders SET status = 'hard_to_ship', updated_at = NOW() WHERE id = $1`,
          [order.id],
        );
        await query(
          `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'hard_to_ship', $2)`,
          [order.id, `Đơn khó nhận ship: quá ${HARD_SHIP_TIMEOUT_MIN} phút chưa có tài xế nhận đơn`],
        );
        console.log(`[HardShipWatcher] Order ${order.code} → hard_to_ship`);
      } catch (err: any) {
        console.error(`[HardShipWatcher] Lỗi track đơn ${order.code}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[HardShipWatcher] Lỗi quét:', err.message);
  }
}

export function startHardShipWatcher(): void {
  void scanHardToShipOrders();
  setInterval(scanHardToShipOrders, SCAN_INTERVAL_MS);
}
