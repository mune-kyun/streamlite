# StreamLite Environment Configuration Guide

This guide explains how to configure the StreamLite mobile app for different environments and how to change backend service URLs.

## 🔧 Quick IP Address Change

When your backend host IP changes, you only need to update **one file**:

### Option 1: Update .env file (Recommended)
```bash
# Edit mobile/StreamLiteMobile/.env
EXPO_PUBLIC_AUTH_SERVICE_URL=http://YOUR_NEW_IP:8001
EXPO_PUBLIC_USER_SERVICE_URL=http://YOUR_NEW_IP:8002
EXPO_PUBLIC_VIDEO_SERVICE_URL=http://YOUR_NEW_IP:8003
```

### Option 2: Set environment variables
```bash
export EXPO_PUBLIC_AUTH_SERVICE_URL=http://YOUR_NEW_IP:8001
export EXPO_PUBLIC_USER_SERVICE_URL=http://YOUR_NEW_IP:8002
export EXPO_PUBLIC_VIDEO_SERVICE_URL=http://YOUR_NEW_IP:8003
```

## 📁 Configuration Files

### Environment Files
- `.env` - Default configuration for all environments
- `.env.development` - Development-specific overrides
- `.env.production` - Production-specific overrides

### Configuration Code
- `src/config/environment.ts` - Main configuration logic
- `src/config/types.ts` - TypeScript type definitions

## 🌍 Environment Variables

All environment variables must be prefixed with `EXPO_PUBLIC_` to be accessible in the React Native app.

### Available Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_ENVIRONMENT` | Environment type | `development` |
| `EXPO_PUBLIC_AUTH_SERVICE_URL` | Auth service URL | `http://192.168.2.195:8001` |
| `EXPO_PUBLIC_USER_SERVICE_URL` | User service URL | `http://192.168.2.195:8002` |
| `EXPO_PUBLIC_VIDEO_SERVICE_URL` | Video service URL | `http://192.168.2.195:8003` |
| `EXPO_PUBLIC_API_TIMEOUT` | API timeout (ms) | `10000` |
| `EXPO_PUBLIC_UPLOAD_TIMEOUT` | Upload timeout (ms) | `30000` |
| `EXPO_PUBLIC_DEBUG_API` | Enable API logging | `true` (dev), `false` (prod) |
| `EXPO_PUBLIC_DEBUG_CONSOLE` | Enable console logs | `true` (dev), `false` (prod) |

## 🚀 Usage Examples

### Development Setup
```bash
# .env.development
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_AUTH_SERVICE_URL=http://localhost:8001
EXPO_PUBLIC_USER_SERVICE_URL=http://localhost:8002
EXPO_PUBLIC_VIDEO_SERVICE_URL=http://localhost:8003
EXPO_PUBLIC_DEBUG_API=true
EXPO_PUBLIC_DEBUG_CONSOLE=true
```

### Production Setup
```bash
# .env.production
EXPO_PUBLIC_ENVIRONMENT=production
EXPO_PUBLIC_AUTH_SERVICE_URL=https://api.streamlite.com/auth
EXPO_PUBLIC_USER_SERVICE_URL=https://api.streamlite.com/user
EXPO_PUBLIC_VIDEO_SERVICE_URL=https://api.streamlite.com/video
EXPO_PUBLIC_DEBUG_API=false
EXPO_PUBLIC_DEBUG_CONSOLE=false
```

### Local Network Testing
```bash
# .env
EXPO_PUBLIC_AUTH_SERVICE_URL=http://192.168.1.100:8001
EXPO_PUBLIC_USER_SERVICE_URL=http://192.168.1.100:8002
EXPO_PUBLIC_VIDEO_SERVICE_URL=http://192.168.1.100:8003
```

## 🔍 Configuration Access in Code

### Import Configuration
```typescript
import { config, getApiEndpoint, getTimeout } from '../config/environment';
```

### Get API Endpoints
```typescript
const authUrl = getApiEndpoint('auth');
const userUrl = getApiEndpoint('user');
const videoUrl = getApiEndpoint('video');
```

### Get Timeouts
```typescript
const defaultTimeout = getTimeout('default');
const uploadTimeout = getTimeout('upload');
const authTimeout = getTimeout('auth');
```

### Check Environment
```typescript
import { isDevelopment, isProduction, isDebugMode } from '../config/environment';

if (isDevelopment()) {
  console.log('Running in development mode');
}

if (isDebugMode()) {
  console.log('Debug mode enabled');
}
```

## 🛠️ Development Workflow

### 1. Starting Development
```bash
cd mobile/StreamLiteMobile
npm start
```

### 2. Changing Backend IP
1. Edit `.env` file
2. Update the IP addresses
3. Restart the Expo development server
4. Refresh the app

### 3. Environment-Specific Testing
```bash
# Test with development config
EXPO_PUBLIC_ENVIRONMENT=development npm start

# Test with production config
EXPO_PUBLIC_ENVIRONMENT=production npm start
```

## 🔧 Troubleshooting

### Configuration Not Loading
1. Ensure environment variables have `EXPO_PUBLIC_` prefix
2. Restart Expo development server after changing `.env` files
3. Check console for configuration validation errors

### API Connection Issues
1. Verify IP addresses in `.env` file
2. Ensure backend services are running
3. Check network connectivity
4. Enable debug logging: `EXPO_PUBLIC_DEBUG_API=true`

### Debug Configuration
```typescript
// Check current configuration
console.log('Current config:', config);

// Verify endpoints
console.log('Auth endpoint:', getApiEndpoint('auth'));
console.log('User endpoint:', getApiEndpoint('user'));
console.log('Video endpoint:', getApiEndpoint('video'));
```

## 📱 Platform-Specific Notes

### Web Development
- Configuration works seamlessly in web browser
- Hot reload supported for configuration changes
- Debug console available in browser dev tools

### Mobile Device Testing
- Ensure mobile device is on same network as backend
- Use actual IP address, not `localhost`
- Test with Expo Go app or development build

## 🔒 Security Considerations

### Development
- Debug logging enabled by default
- Detailed error messages shown
- Network errors displayed to user

### Production
- Debug logging disabled
- Minimal error information exposed
- Secure HTTPS endpoints recommended

## 📋 Configuration Checklist

Before deploying or changing environments:

- [ ] Update `.env` file with correct IP addresses
- [ ] Verify all backend services are accessible
- [ ] Test API connectivity
- [ ] Check debug settings for environment
- [ ] Validate timeout configurations
- [ ] Test on target platform (web/mobile)

## 🆘 Support

If you encounter issues with environment configuration:

1. Check the console for configuration validation errors
2. Verify environment variable syntax
3. Ensure backend services are running and accessible
4. Test with curl commands to verify API connectivity
5. Check network firewall settings

## 📝 Example Configuration Files

### Complete .env Example
```bash
# StreamLite Environment Configuration
EXPO_PUBLIC_ENVIRONMENT=development

# Backend Services (Update these when IP changes)
EXPO_PUBLIC_AUTH_SERVICE_URL=http://192.168.2.195:8001
EXPO_PUBLIC_USER_SERVICE_URL=http://192.168.2.195:8002
EXPO_PUBLIC_VIDEO_SERVICE_URL=http://192.168.2.195:8003

# Timeouts (milliseconds)
EXPO_PUBLIC_API_TIMEOUT=15000
EXPO_PUBLIC_UPLOAD_TIMEOUT=60000

# Debug Settings
EXPO_PUBLIC_DEBUG_API=true
EXPO_PUBLIC_DEBUG_CONSOLE=true

# App Version
EXPO_PUBLIC_APP_VERSION=1.0.0
```

This configuration system ensures that changing backend IP addresses is as simple as updating a single file!
