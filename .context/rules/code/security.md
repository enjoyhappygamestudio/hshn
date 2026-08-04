# C-008 — Security

## Rules
- Không hardcode API keys, tokens
- Dùng `react-native-dotenv` hoặc Expo Config
- Token lưu trong SecureStore (iOS Keychain / Android EncryptedSharedPreferences)
- API key admin lưu trong biến môi trường server
- Validate tất cả đầu vào từ user
- XSS prevention: không `dangerouslySetInnerHTML`
- SQL injection: parameterized queries
- Rate limiting: login, order creation
