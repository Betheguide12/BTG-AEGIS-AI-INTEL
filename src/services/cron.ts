/**
 * BTG AEGIS - Background Intelligence Sync (Cron Emulation)
 * This handles the orchestration of real-time intel fetching even when 
 * the dashboard is not the primary focused tab.
 */

import { getRealTimeIntel } from './geminiService';

export type SyncCallback = (data: any[]) => void;

class AegisCron {
  private intervalId: number | null = null;
  private subscribers: SyncCallback[] = [];
  private isRunning: boolean = false;

  constructor(private intervalMs: number = 45000) {} // Reduced from 5m to 45s for real-time feel

  subscribe(callback: SyncCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log(`[AEGIS_CRON] Background Intel Sync Triggered. Interval: ${this.intervalMs}ms`);
    
    // Initial fetch - Essential for immediate live view
    await this.execute();
    
    this.intervalId = window.setInterval(() => {
      this.execute();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[AEGIS_CRON] Background Intel Sync Stopped.');
  }

  private async execute() {
    try {
      const data = await getRealTimeIntel();
      if (data && data.length > 0) {
        this.subscribers.forEach(sub => sub(data));
      }
    } catch (err) {
      console.error('[AEGIS_CRON] Intel Sync Failed:', err);
    }
  }
}

export const aegisCron = new AegisCron();
