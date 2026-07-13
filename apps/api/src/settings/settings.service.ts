import { Injectable, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

interface SystemSettings {
  companyName: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  termsAndConditions: string;
}

@Injectable()
export class SettingsService {
  private configPath = path.join(__dirname, '../../src/config/settings.json');
  private defaultSettings: SystemSettings = {
    companyName: 'RepairFlow Service',
    phone: '+1-555-0199',
    email: 'contact@repairflow.com',
    taxRate: 10,
    currency: 'USD',
    termsAndConditions: 'All repairs carry a 90-day warranty on replaced parts. Payments are due within 7 days of completion.',
  };

  constructor(private readonly auditLogs: AuditLogsService) {
    // Ensure the config directory exists
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Write defaults if file doesn't exist
    if (!fs.existsSync(this.configPath)) {
      this.saveToFile(this.defaultSettings);
    }
  }

  private saveToFile(settings: SystemSettings) {
    fs.writeFileSync(this.configPath, JSON.stringify(settings, null, 2), 'utf-8');
  }

  async getSettings(): Promise<SystemSettings> {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error reading settings file, returning defaults', err);
    }
    return this.defaultSettings;
  }

  async updateSettings(data: Partial<SystemSettings>, actor: any): Promise<SystemSettings> {
    if (actor.role !== 'SYSTEM_ADMIN' && actor.role !== 'OWNER') {
      throw new ForbiddenException('Only System Administrators or Owners can configure system settings.');
    }

    const current = await this.getSettings();
    const updated = { ...current, ...data };
    
    this.saveToFile(updated);

    // Audit Log settings update
    await this.auditLogs.createLog(
      null,
      actor.id,
      null,
      'UPDATE_SYSTEM_SETTINGS',
      'SystemSettings',
      'global',
      current,
      updated,
    );

    return updated;
  }
}
