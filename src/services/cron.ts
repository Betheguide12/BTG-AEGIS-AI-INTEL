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
  private cooldownActive: boolean = false;
  private cooldownTimer: number | null = null;

  constructor(private intervalMs: number = 120000) {} // Optimized to 2 mins to respect API quotas

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
    
    // Initial fetch
    await this.execute();
    
    this.setupInterval();
  }

  private setupInterval(customInterval?: number) {
    if (this.intervalId) window.clearInterval(this.intervalId);
    
    this.intervalId = window.setInterval(() => {
      this.execute();
    }, customInterval || this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.cooldownTimer) {
      window.clearTimeout(this.cooldownTimer);
      this.cooldownTimer = null;
    }
    this.isRunning = false;
    console.log('[AEGIS_CRON] Background Intel Sync Stopped.');
  }

  private async execute() {
    if (this.cooldownActive) return;

    try {
      const data = await getRealTimeIntel();
      if (data && data.length > 0) {
        this.subscribers.forEach(sub => sub(data));
      } else if (data === null) {
        // This usually means a fatal error or 429 handled by service
      }
    } catch (err: any) {
      console.error('[AEGIS_CRON] Intel Sync Failed:', err);
      
      // If we detect a rate limit, enter cooldown mode
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        this.activateCooldown();
      }
    }
  }

  private activateCooldown() {
    if (this.cooldownActive) return;
    
    this.cooldownActive = true;
    const cooldownDuration = 300000; // 5 minute forced silence
    
    console.warn(`[AEGIS_CRON] QUOTA_EXHAUSTED. Entering 5-minute cooldown.`);
    
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.cooldownTimer = window.setTimeout(() => {
      this.cooldownActive = false;
      this.cooldownTimer = null;
      console.log(`[AEGIS_CRON] Cooldown expired. Resuming sync...`);
      this.start();
    }, cooldownDuration);
  }

  public isCoolingDown() {
    return this.cooldownActive;
  }
}

export const aegisCron = new AegisCron();
