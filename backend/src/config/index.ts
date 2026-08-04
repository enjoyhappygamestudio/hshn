import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'haisanhanoi',
    user: process.env.DB_USER || 'hshn_user',
    pass: process.env.DB_PASS || 'hshn_pass',
    url: process.env.DATABASE_URL || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  hardShipTimeoutMin: parseInt(process.env.HARD_SHIP_TIMEOUT_MIN || '10', 10),
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  r2: {
    enabled: process.env.R2_ENABLED === 'true',
    endpoint: process.env.R2_ENDPOINT || '',
    accountId: process.env.R2_ACCOUNT_ID || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    publicUrl: process.env.R2_PUBLIC_URL || '',
    buckets: {
      // media = ảnh + video (giữ R2_BUCKET làm fallback tương thích ngược)
      media: process.env.R2_MEDIA_BUCKET || process.env.R2_BUCKET || '',
      documents: process.env.R2_DOCUMENTS_BUCKET || '',
      backups: process.env.R2_BACKUPS_BUCKET || '',
    },
  },
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    hourUtc: parseInt(process.env.BACKUP_HOUR_UTC || '3', 10),
    keepDays: parseInt(process.env.BACKUP_KEEP_DAYS || '30', 10),
  },
  shipping: {
    ghn: {
      enabled: process.env.GHN_ENABLED === 'true',
      apiUrl: process.env.GHN_API_URL || 'https://online-gateway.ghn.vn/shipping',
      token: process.env.GHN_TOKEN || '',
    },
    ghtk: {
      enabled: process.env.GHTK_ENABLED === 'true',
      apiUrl: process.env.GHTK_API_URL || 'https://services.ghtk.vn',
      token: process.env.GHTK_TOKEN || '',
    },
    viettel: {
      enabled: process.env.VIETTEL_ENABLED === 'true',
      apiUrl: process.env.VIETTEL_API_URL || 'https://partner.viettelpost.vn/v2',
      token: process.env.VIETTEL_TOKEN || '',
    },
    ahamove: {
      enabled: process.env.AHAMOVE_ENABLED === 'true',
      apiUrl: process.env.AHAMOVE_API_URL || 'https://partner-api.ahamove.com',
      token: process.env.AHAMOVE_TOKEN || '',
      mobile: process.env.AHAMOVE_MOBILE || '0936141757',
      shopName: process.env.AHAMOVE_SHOP_NAME || 'MEH Seafood',
      shopPhone: process.env.AHAMOVE_SHOP_PHONE || '0936141757',
      shopAddress: process.env.AHAMOVE_SHOP_ADDRESS || '47 ngõ 16 Phan Văn Trường, Cầu Giấy, Hà Nội',
      shopLat: parseFloat(process.env.AHAMOVE_SHOP_LAT || '21.0324'),
      shopLng: parseFloat(process.env.AHAMOVE_SHOP_LNG || '105.7975'),
    },
    grab: {
      enabled: process.env.GRAB_ENABLED === 'true',
      apiUrl: process.env.GRAB_API_URL || 'https://api.grab.com',
      token: process.env.GRAB_TOKEN || '',
    },
    bee: {
      enabled: process.env.BEE_ENABLED === 'true',
      apiUrl: process.env.BEE_API_URL || 'https://api.be.com.vn',
      token: process.env.BEE_TOKEN || '',
    },
  },
};
