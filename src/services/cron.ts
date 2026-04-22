/**
 * BTG AEGIS - Background Intelligence Sync (Cron Emulation)
 * This handles the orchestration of real-time intel fetching even when 
 * the dashboard is not the primary focused tab.
 */

import { getRealTimeIntel } from './geminiService';
import supabase from '../supabase';
export type SyncCallback = (data: any[]) => void;

class AegisCron {
  private intervalId: number | null = null;
  private subscribers: SyncCallback[] = [];
  private isRunning: boolean = false;

  constructor(private intervalMs: number = 300000) {} // Default 5 mins

  subscribe(callback: SyncCallback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Initial fetch
    this.execute();
    
    this.intervalId = window.setInterval(() => {
      this.execute();
    }, this.intervalMs);
    
    console.log(`[AEGIS_CRON] Background Intel Sync Started. Interval: ${this.intervalMs}ms`);
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
      alert("CRON RUNNING");
alert("DATA RECEIVED:");
alert(JSON.stringify(data));
      console.log("AI DATA:", data);
if (data && data.length > 0) {
  for (const item of data) {
    console.log("Saving item:", item);

    const { error } = await supabase.from('alerts').insert([
      {
        message: item.title,
        severity: item.risk || "medium",
        created_at: new Date(item.time || Date.now()).toISOString()
      }
    ]);

    if (error) {
      console.error("SUPABASE ERROR:", error);
    } else {
      console.log("Saved successfully");
    }
  }
}

this.subscribers.forEach(sub => sub(data));
      }
    } catch (err) {
      console.error('[AEGIS_CRON] Intel Sync Failed:', err);
    }
  }
}

export const aegisCron = new AegisCron();
