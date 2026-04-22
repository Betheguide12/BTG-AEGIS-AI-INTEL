import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    // 🔴 PUT YOUR REAL ALERT LOGIC HERE
    // This should return the same structure you showed earlier

    const response = await getYourAlerts(); // 👈 you must replace this

    const alerts = response.alerts || [];

    for (const item of alerts) {
      await supabase.from('alerts').insert([
        {
          message: item.title,
          severity: item.risk,
          created_at: new Date(item.time).toISOString()
        }
      ]);
    }

    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
