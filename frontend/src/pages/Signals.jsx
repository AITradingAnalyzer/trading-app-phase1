import { useEffect, useState } from "react";
import { fetchSignals } from "../api";

export default function Signals() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSignals() {
      try {
        const data = await fetchSignals();
        setSignals(data);
      } catch (err) {
        setError(err.message || "Failed to load signals");
      } finally {
        setLoading(false);
      }
    }

    loadSignals();
  }, []);

  if (loading) return <p>Loading signals...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div>
      <h1>Signals</h1>
      {signals.length === 0 ? (
        <p>No signals available yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {signals.map((signal) => (
            <div
              key={signal.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "12px",
                padding: "16px",
                background: "#fff",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{signal.symbol}</h3>
              <p><strong>Signal:</strong> {signal.signal}</p>
              <p><strong>Confidence:</strong> {signal.confidence}</p>
              <p><strong>Analysis:</strong> {signal.analysis_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}