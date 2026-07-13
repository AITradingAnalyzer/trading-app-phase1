import { useEffect, useState } from "react";
import { API_BASE_URL, fetchSchedulerStatus } from "../api";

export default function Settings() {
  const [scheduler, setScheduler] = useState(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await fetchSchedulerStatus();
        setScheduler(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadStatus();
  }, []);

  return (
    <div>
      <h1>Settings</h1>
      <p><strong>Backend URL:</strong> {API_BASE_URL}</p>

      {scheduler && (
        <div style={{ marginTop: "20px" }}>
          <p><strong>Scheduler Running:</strong> {String(scheduler.running)}</p>
          <p><strong>Interval Hours:</strong> {scheduler.interval_hours}</p>
          <p><strong>Next Run:</strong> {scheduler.next_run_time || "N/A"}</p>
        </div>
      )}
    </div>
  );
}