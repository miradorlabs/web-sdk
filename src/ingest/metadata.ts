/**
 * Browser metadata collection utilities
 */

interface BrowserInfo {
  name: string;
  version: string;
}

interface OSInfo {
  name: string;
  version: string;
}

interface NetworkInformation {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
}

/**
 * Detect browser name and version from user agent
 */
export function detectBrowser(ua: string): BrowserInfo {
  if (ua.includes('Edg/')) {
    return {
      name: 'Edge',
      version: ua.match(/Edg\/(\d+(\.\d+)?)/)?.[1] || 'unknown',
    };
  }
  if (ua.includes('Chrome/')) {
    return {
      name: 'Chrome',
      version: ua.match(/Chrome\/(\d+(\.\d+)?)/)?.[1] || 'unknown',
    };
  }
  if (ua.includes('Firefox/')) {
    return {
      name: 'Firefox',
      version: ua.match(/Firefox\/(\d+(\.\d+)?)/)?.[1] || 'unknown',
    };
  }
  if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    return {
      name: 'Safari',
      version: ua.match(/Version\/(\d+(\.\d+)?)/)?.[1] || 'unknown',
    };
  }
  return { name: 'Unknown', version: 'unknown' };
}

/**
 * Detect operating system name and version from user agent
 */
export function detectOS(ua: string): OSInfo {
  if (ua.includes('Windows NT')) {
    const ntVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1];
    return {
      name: 'Windows',
      version: ntVersion === '10.0' ? '10/11' : ntVersion || 'unknown',
    };
  }
  if (ua.includes('Mac OS X')) {
    return {
      name: 'macOS',
      version: ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown',
    };
  }
  if (ua.includes('Android')) {
    return {
      name: 'Android',
      version: ua.match(/Android (\d+(\.\d+)?)/)?.[1] || 'unknown',
    };
  }
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    return {
      name: 'iOS',
      version: ua.match(/OS (\d+[._]\d+)/)?.[1]?.replace('_', '.') || 'unknown',
    };
  }
  if (ua.includes('Linux')) {
    return { name: 'Linux', version: 'unknown' };
  }
  return { name: 'Unknown', version: 'unknown' };
}

/**
 * Detect device type from user agent
 */
export function detectDeviceType(ua: string): 'desktop' | 'mobile' | 'tablet' {
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    return /iPad|Tablet/i.test(ua) ? 'tablet' : 'mobile';
  }
  return 'desktop';
}

/**
 * Gather client metadata from the browser environment
 * Note: IP address is captured by the backend from request headers
 */
export function getClientMetadata(): { [key: string]: string } {
  const metadata: { [key: string]: string } = {};
  const ua = navigator.userAgent;

  // Browser detection
  const browser = detectBrowser(ua);
  metadata.browser = browser.name;
  metadata.browserVersion = browser.version;

  // OS detection
  const os = detectOS(ua);
  metadata.os = os.name;
  metadata.osVersion = os.version;

  // Device type
  metadata.deviceType = detectDeviceType(ua);

  // Core browser info
  metadata.userAgent = ua;
  metadata.language = navigator.language;
  metadata.languages = navigator.languages?.join(',') || navigator.language;

  // Screen and display
  metadata.screenWidth = window.screen.width.toString();
  metadata.screenHeight = window.screen.height.toString();
  metadata.viewportWidth = window.innerWidth.toString();
  metadata.viewportHeight = window.innerHeight.toString();
  metadata.colorDepth = window.screen.colorDepth.toString();
  metadata.pixelRatio = window.devicePixelRatio?.toString() || '1';

  // Hardware capabilities
  metadata.cpuCores = navigator.hardwareConcurrency?.toString() || 'unknown';
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory) {
    metadata.deviceMemory = nav.deviceMemory.toString();
  }

  // Touch support
  metadata.touchSupport = ('ontouchstart' in window || navigator.maxTouchPoints > 0).toString();
  metadata.maxTouchPoints = navigator.maxTouchPoints?.toString() || '0';

  // Connection info (Network Information API - non-standard)
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (connection) {
    metadata.connectionType = connection.effectiveType || 'unknown';
    if (connection.downlink) {
      metadata.connectionSpeed = connection.downlink.toString();
    }
    if (connection.saveData !== undefined) {
      metadata.dataSaver = connection.saveData.toString();
    }
  }

  // Browser state
  metadata.cookiesEnabled = navigator.cookieEnabled.toString();
  metadata.online = navigator.onLine.toString();
  metadata.doNotTrack = navigator.doNotTrack || 'unspecified';

  // Timezone
  metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  metadata.timezoneOffset = new Date().getTimezoneOffset().toString();

  // Page context
  metadata.url = window.location.href;
  metadata.origin = window.location.origin;
  metadata.pathname = window.location.pathname;
  metadata.referrer = document.referrer || 'direct';

  // Document state
  metadata.documentVisibility = document.visibilityState;

  return metadata;
}
