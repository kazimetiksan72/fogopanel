import { DEMO_CODE } from './mobile-auth';

export interface MobileSmsService {
  sendCode(phone: string, code: string): Promise<void>;
}

// SMS provider is not configured yet. The app shows the fixed demo code on its
// verification screen; this adapter intentionally does not log or return it.
const demoSmsService: MobileSmsService = {
  async sendCode(_phone, _code) {},
};

export function getMobileSmsService(): MobileSmsService | null {
  return process.env.MOBILE_AUTH_DEMO_CODE_ENABLED === 'false' ? null : demoSmsService;
}

export async function sendMobileCode(phone: string) {
  const service = getMobileSmsService();
  if (!service) return false;
  await service.sendCode(phone, DEMO_CODE);
  return true;
}
