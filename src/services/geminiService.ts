/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const isAegisOnline = async () => {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    return data.secure;
  } catch {
    return false;
  }
};

export async function getRealTimeIntel() {
  try {
    const response = await fetch("/api/intel");
    if (!response.ok) {
      if (response.status === 429) throw new Error("429");
      return null;
    }
    return await response.json();
  } catch (error: any) {
    if (error.message === "429") throw error;
    console.error("Intel fetch failed:", error);
    return null;
  }
}

export async function getOracleBriefing(context: string) {
  try {
    const response = await fetch("/api/oracle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context })
    });
    const data = await response.json();
    return data.text || "SIGNAL INTERRUPTED.";
  } catch (error) {
    return "SIGNAL INTERRUPTED.";
  }
}
