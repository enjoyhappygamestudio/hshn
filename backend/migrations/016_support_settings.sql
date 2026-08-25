-- ========== 016: Thông tin hỗ trợ (hotline, email, văn phòng, FAQ) ==========

CREATE TABLE IF NOT EXISTS support_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotline_display VARCHAR(50) NOT NULL DEFAULT '1900 123 456',
  hotline_tel VARCHAR(30) NOT NULL DEFAULT '1900123456',
  hours TEXT NOT NULL DEFAULT '7:00 - 22:00 • Tất cả các ngày',
  zalo_url TEXT NOT NULL DEFAULT 'https://zalo.me/1900123456',
  email VARCHAR(255) NOT NULL DEFAULT 'support@haisanhanoi.vn',
  office_address TEXT NOT NULL DEFAULT 'Số 12, ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO support_settings (
  hotline_display, hotline_tel, hours, zalo_url, email, office_address
)
SELECT
  '1900 123 456',
  '1900123456',
  '7:00 - 22:00 • Tất cả các ngày',
  'https://zalo.me/1900123456',
  'support@haisanhanoi.vn',
  'Số 12, ngõ 88 Trần Duy Hưng, Cầu Giấy, Hà Nội'
WHERE NOT EXISTS (SELECT 1 FROM support_settings);

CREATE TABLE IF NOT EXISTS support_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO support_faqs (question, answer, sort_order)
SELECT * FROM (VALUES
  ('Làm sao để đặt hàng?', 'Chọn sản phẩm, thêm vào giỏ hàng, chọn phương thức giao hàng & thanh toán, xác nhận đơn hàng.', 1),
  ('Thời gian giao hàng bao lâu?', 'Nội thành Hà Nội: 1-3 giờ (hỏa tốc) hoặc hẹn giờ. Ngoại thành: 3-6 giờ.', 2),
  ('Có được kiểm tra hàng không?', 'Có. Bạn được kiểm tra số lượng, chủng loại trước khi thanh toán.', 3),
  ('Chính sách đổi trả?', 'Hải sản tươi sống không hỗ trợ đổi trả. Nếu sản phẩm không đạt chất lượng, vui lòng liên hệ hotline trong vòng 2 giờ.', 4),
  ('Làm sao để hủy đơn?', 'Vào mục Đơn mua > chọn đơn > Hủy đơn. Chỉ hủy được khi đơn chưa vào bếp.', 5)
) AS seed(question, answer, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM support_faqs);
