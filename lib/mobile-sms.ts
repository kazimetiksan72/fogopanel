import { DEMO_CODE } from './mobile-auth';

export interface MobileSmsService {
  mode: 'demo' | 'sms';
  createCode(): string;
  sendCode(phone: string, code: string): Promise<void>;
}

// SMS provider is not configured yet. The app shows the fixed demo code on its
// verification screen; this adapter intentionally does not log or return it.
const demoSmsService: MobileSmsService = {
  mode: 'demo',
  createCode: () => DEMO_CODE,
  async sendCode(_phone, _code) {},
};

export function isDemoCodeEnabled() {
  return process.env.MOBILE_AUTH_DEMO_CODE_ENABLED !== 'false';
}

export function getMobileSmsService(): MobileSmsService | null {
  return isDemoCodeEnabled() ? demoSmsService : null;
}
