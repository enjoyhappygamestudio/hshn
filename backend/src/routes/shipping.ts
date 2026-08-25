import { Router, Request, Response } from 'express';
import { query } from '../utils/db';
import { success, error } from '../utils/response';
import { authenticate, AuthRequest } from '../middleware/auth';
import { calculateFee, createShipOrder, trackShipOrder, getActiveCarriers, serviceForDeliveryMode } from '../services/carrier';
import { config } from '../config';

const router = Router();

const SHOP_LAT = config.shipping.ahamove.shopLat;
const SHOP_LNG = config.shipping.ahamove.shopLng;

function simulateFee(toLat: number, toLng: number, p: any) {
  const estKm = Math.max(2, Math.round(
    Math.sqrt(Math.pow((toLat - SHOP_LAT) * 111, 2) + Math.pow((toLng - SHOP_LNG) * 111, 2))
  ));
  const rawFee = p.base_fee + p.fee_per_km * estKm;
  return Math.max(p.min_fee, Math.min(rawFee, p.max_fee));
}

// GET /api/shipping/partners — Danh sách đối tác (không gọi carrier API trừ khi with_fee=1)
router.get('/partners', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 21.0285;
    const lng = parseFloat(req.query.lng as string) || 105.8542;
    const weight = parseFloat(req.query.weight as string) || 1;
    const withFee = req.query.with_fee === '1' || req.query.with_fee === 'true';

    const hasRealCarriers = getActiveCarriers().length > 0;
    let realFees: { carrier: string; fee: number; estimatedDays: number }[] = [];
    if (withFee && hasRealCarriers) {
      try {
        realFees = await calculateFee({ fromLat: SHOP_LAT, fromLng: SHOP_LNG, toLat: lat, toLng: lng, weight });
      } catch {}
    }

    const partners = await query(
      `SELECT id, name, logo, base_fee, fee_per_km, fee, estimated_days, active, sort_order, min_fee, max_fee, description
       FROM shipping_partners WHERE active = true
       ORDER BY sort_order ASC`,
    );

    // Chỉ hiện partner có carrier đang bật trong .env (vd GRAB_ENABLED=false → ẩn Grab; BEE_ENABLED=false → ẩn Be; Xanh SM chưa có carrier → ẩn)
    const enabledNames = new Set(getActiveCarriers().map(c => c.name));

    const data = partners.rows
      .filter((p: any) => enabledNames.has(p.name))
      .map((p: any) => {
      const realFee = withFee ? realFees.find(r => r.carrier === p.name) : undefined;
      const fee = realFee ? realFee.fee : (withFee ? simulateFee(lat, lng, p) : 0);
      const estDays = realFee ? realFee.estimatedDays : p.estimated_days;
      const timeMinutes = 30 + (estDays || 1) * 60;
      const ratings: Record<string, { score: number; count: number }> = {
        'GHN': { score: 4.8, count: 2500 },
        'GHTK': { score: 4.6, count: 1800 },
        'ViettelPost': { score: 4.7, count: 3200 },
        'AhaMove': { score: 4.5, count: 1200 },
        'Grab': { score: 4.7, count: 3500 },
        'Be': { score: 4.4, count: 800 },
        'Bee': { score: 4.4, count: 800 },
        'XanhSM': { score: 4.3, count: 600 },
        'Xanh SM': { score: 4.3, count: 600 },
      };
      const r = ratings[p.name] || { score: 4.5, count: 500 };

      return {
        id: p.id,
        name: p.name,
        logo: p.logo,
        carrier: p.name,
        fee,
        isReal: !!realFee || getActiveCarriers().some(c => c.name === p.name),
        timeMinutes,
        timeText: timeMinutes > 120
          ? `${Math.ceil(timeMinutes / 60)}-${Math.ceil((timeMinutes + 60) / 60)} giờ`
          : `${timeMinutes}-${timeMinutes + 30} phút`,
        rating: r.score,
        ratingCount: r.count,
        available: true,
        description: p.description,
      };
    });

    res.json(success(data));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/shipping/calculate — Tính phí vận chuyển thực tế (chỉ khi có tọa độ địa chỉ giao)
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const { carrier, toLat, toLng, weight, cod, delivery_mode } = req.body;
    if (carrier && typeof toLat === 'number' && typeof toLng === 'number') {
      const active = getActiveCarriers();
      const c = active.find(a => a.name === carrier);
      if (c) {
        const result = await c.calculateFee({
          fromLat: SHOP_LAT,
          fromLng: SHOP_LNG,
          toLat,
          toLng,
          weight: weight || 1,
          cod,
          serviceId: serviceForDeliveryMode(delivery_mode),
        });
        return res.json(success([result]));
      }
    }
    res.json(success([]));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/shipping/create-order — Tạo đơn ship thực tế
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { carrier, ...orderData } = req.body;
    const result = await createShipOrder(carrier, orderData);
    res.json(success(result));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// GET /api/shipping/track/:carrier/:code — Tra cứu vận đơn
router.get('/track/:carrier/:code', async (req: Request, res: Response) => {
  try {
    const result = await trackShipOrder(req.params.carrier, req.params.code);
    res.json(success(result));
  } catch (err: any) {
    res.status(500).json(error(err.message));
  }
});

// POST /api/shipping/webhook/:carrier — Nhận callback từ carrier
router.post('/webhook/:carrier', async (req: Request, res: Response) => {
  try {
    const { carrier } = req.params;
    const payload = req.body;
    const trackingCode = payload.order_code || payload.tracking_code || payload.order_id || '';
    const status = payload.status || payload.state || '';
    const updated = await query(
      `UPDATE orders SET shipping_status = $1, updated_at = NOW()
       WHERE shipping_tracking_code = $2
       RETURNING id`,
      [status, trackingCode],
    );
    if (updated.rows.length > 0) {
      await query(
        `INSERT INTO order_tracking (order_id, status, note) VALUES ($1, 'shipping', $2)`,
        [updated.rows[0].id, `Cập nhật từ ${carrier}: ${status}`],
      );
    }
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

export default router;
