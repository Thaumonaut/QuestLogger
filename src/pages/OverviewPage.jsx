import { useApp } from "../context/AppContext";
import EarningsCard from "../components/EarningsCard";
import Heatmap from "../components/Heatmap";

export default function OverviewPage() {
  const { entries, loading } = useApp();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <span style={{ fontSize: 13, color: "var(--color-muted)" }}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
      <EarningsCard />
      <Heatmap entries={entries} />
    </div>
  );
}
