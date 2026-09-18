import { ApplicationStatus } from '@prisma/client';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  let sent: any[];

  beforeEach(() => {
    process.env.SMTP_USER = 'test@hsd.test';
    process.env.SMTP_PASS = 'gizli';
    sent = [];
    service = new MailService();
    (service as any).transporter = {
      sendMail: jest.fn(async (options: any) => {
        sent.push(options);
      }),
    };
  });

  describe('sendApplicationResult', () => {
    it('ACCEPTED durumunda onay metni göndermeli', async () => {
      await service.sendApplicationResult('e@t.test', 'Elif', ApplicationStatus.ACCEPTED);

      expect(sent[0].text).toContain('onaylanmıştır');
      expect(sent[0].text).not.toContain('olumlu sonuçlanamamıştır');
    });

    it('REJECTED durumunda ret metni göndermeli', async () => {
      await service.sendApplicationResult('e@t.test', 'Elif', ApplicationStatus.REJECTED);

      expect(sent[0].text).toContain('olumlu sonuçlanamamıştır');
    });
  });

  describe('sendPasswordReset', () => {
    it('sıfırlama bağlantısını token ile göndermeli', async () => {
      await service.sendPasswordReset('e@t.test', 'Elif', 'abc123');

      expect(sent[0].text).toContain('abc123');
    });
  });
});
