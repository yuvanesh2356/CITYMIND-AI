import { useState, useEffect, useRef, useCallback } from "react";
import { jsPDF } from "jspdf";
// DESIGN TOKENS
const T = {
  cyan: "#00d4ff",
  cyanDim: "rgba(0,212,255,0.15)",
  cyanGlow: "0 0 20px rgba(0,212,255,0.3), 0 0 60px rgba(0,212,255,0.08)",
  blue: "#0066ff",
  purple: "#7c3aed",
  gold: "#ffd700",
  critical: "#ff3b3b",
  high: "#ff8c00",
  medium: "#ffd60a",
  low: "#34d399",
  bgVoid: "#020408",
  bgBase: "#060d16",
  bgSurface: "#0a1624",
  bgElevated: "#0f1e32",
  glass: "rgba(10,22,36,0.85)",
  glassBorder: "rgba(0,212,255,0.12)",
  agents: {
    vision: { color: "#00d4ff", icon: "👁", name: "Vision Agent" },
    severity: { color: "#ff4d4d", icon: "⚠️", name: "Severity Agent" },
    prediction: { color: "#a855f7", icon: "🔮", name: "Prediction Agent" },
    budget: { color: "#10b981", icon: "💰", name: "Budget Agent" },
    planning: { color: "#f59e0b", icon: "📋", name: "Planning Agent" },
    comms: { color: "#60a5fa", icon: "📡", name: "Comms Agent" },
    mayor: { color: "#ffd700", icon: "🏛", name: "Mayor Agent" },
  },
};
// MOCK DATA
const MOCK_ISSUES = [
  { id: "ISS-2847", type: "pothole", zone: "East District", severity: 87, status: "critical", risk: "HIGH", lat: 40.7282, lng: -73.7949, desc: "Large pothole on arterial road", cost: 45000 },
  { id: "ISS-2841", type: "water_leak", zone: "North Grid", severity: 73, status: "high", risk: "HIGH", lat: 40.7589, lng: -73.9851, desc: "Water main leak near school", cost: 120000 },
  { id: "ISS-2839", type: "broken_light", zone: "South Park", severity: 41, status: "medium", risk: "MEDIUM", lat: 40.6892, lng: -73.9442, desc: "3 streetlights out on bike path", cost: 8500 },
  { id: "ISS-2835", type: "garbage", zone: "West Market", severity: 28, status: "low", risk: "LOW", lat: 40.7549, lng: -74.0045, desc: "Illegal dumping site growing", cost: 3200 },
  { id: "ISS-2831", type: "road_crack", zone: "Central Ave", severity: 62, status: "high", risk: "HIGH", lat: 40.7128, lng: -74.0060, desc: "Extensive cracking near bridge", cost: 67000 },
  { id: "ISS-2828", type: "water_leak", zone: "East District", severity: 55, status: "medium", risk: "MEDIUM", lat: 40.7310, lng: -73.7820, desc: "Burst pipe flooding sidewalk", cost: 31000 },
  { id: "ISS-2819", type: "pothole", zone: "West Market", severity: 38, status: "low", risk: "LOW", lat: 40.7560, lng: -74.0120, desc: "Pothole cluster near bus stop", cost: 12000 },
];

const MOCK_FEED = [
  { agent: "vision", action: "Analyzed image — Pothole detected (94% confidence)", time: "2s ago", issueId: "ISS-2847" },
  { agent: "severity", action: "Risk score computed: 87/100 — CRITICAL", time: "4s ago", issueId: "ISS-2847" },
  { agent: "budget", action: "Inserted into priority queue at position #2", time: "6s ago", issueId: "ISS-2847" },
  { agent: "prediction", action: "Zone flagged as emerging hotspot (East District)", time: "12s ago", issueId: "ISS-2841" },
  { agent: "planning", action: "Crew #7 scheduled — 14 Jun 09:00", time: "18s ago", issueId: "ISS-2841" },
  { agent: "comms", action: "Acknowledgment sent to citizen #C-4821", time: "22s ago", issueId: "ISS-2839" },
  { agent: "mayor", action: "City Health Score updated: 72 → 71", time: "35s ago", issueId: null },
  { agent: "prediction", action: "Failure probability rising in North Grid (78%)", time: "1m ago", issueId: "ISS-2841" },
  { agent: "budget", action: "Budget reoptimization triggered — 3 items reprioritized", time: "2m ago", issueId: null },
  { agent: "severity", action: "Road crack severity escalated — new assessment", time: "3m ago", issueId: "ISS-2831" },
];

const MOCK_DEBATE = [
  { agent: "severity", text: "Issue ISS-2847 has a risk score of 87/100 with 34% accident probability on a road serving 12,000 vehicles daily. This must be prioritized immediately — delay means someone gets hurt.", stance: "support" },
  { agent: "budget", text: "I understand the risk, but the $45,000 repair cost for ISS-2847 would consume 23% of our Q2 emergency budget. We could address 4 medium-risk issues for the same cost. The cumulative impact reduction is higher.", stance: "oppose" },
  { agent: "planning", text: "This road segment is already scheduled for full resurfacing in 6 weeks. A full repair now would be redundant. However, a temporary barrier and patching solution could reduce accident probability by 70% at $8,000.", stance: "propose_alternative" },
  { agent: "severity", text: "The temporary patch approach is acceptable if it demonstrably reduces the accident probability below 10%. I can confirm a proper patch + barrier system achieves this. I revise my position: temporary fix now, permanent resurfacing on existing schedule.", stance: "support" },
  { agent: "mayor", text: "CONSENSUS REACHED: Immediate temporary barrier deployment + patch repair ($8,000). Full resurfacing remains on June 28 schedule. Net saving: $37,000 redirected to North Grid water main (ISS-2841). Confidence: 94%.", stance: "consensus" },
];

const ZONES = [
  { name: "East District", risk: 91, prediction: "Pipe failure in 8 days", color: "#ff3b3b" },
  { name: "North Grid", risk: 78, prediction: "Road degradation in 14 days", color: "#ff8c00" },
  { name: "Central Ave", risk: 62, prediction: "Bridge joint failure in 21 days", color: "#ffd60a" },
  { name: "West Market", risk: 34, prediction: "No critical failures predicted", color: "#34d399" },
  { name: "South Park", risk: 28, prediction: "Lighting failure in 30 days", color: "#34d399" },
];

const PIPELINE = [
  { key: "vision", label: "Image classification & metadata parsing" },
  { key: "severity", label: "Risk scoring & safety analysis" },
  { key: "prediction", label: "Historical failure forecasting" },
  { key: "budget", label: "Budget allocation optimization" },
  { key: "planning", label: "Crew routing & scheduling" },
  { key: "comms", label: "Citizen notification drafting" },
  { key: "mayor", label: "City health score update" },
];
// MAYOR CHAT MESSAGES
const MAYOR_RESPONSES = {
  default: "I've analyzed data across all 7 agents. The East District requires immediate attention — a water main serving 8,400 residents has a 78% failure probability within 14 days. Simultaneously, Issue ISS-2847 (arterial pothole) has been resolved via consensus with a $37,000 budget saving. City Health Score is currently 71/100, down 1 point due to North Grid deterioration.",
  critical: "Critical areas right now: (1) East District — water main failure imminent, 8,400 residents at risk. (2) North Grid — 3 connected infrastructure segments degrading simultaneously, suggesting systemic issue. Recommend emergency inspection of 1960s-era pipes in this zone. Budget Agent has pre-approved $180,000 emergency allocation.",
  budget: "Current Q2 budget: $2.4M total. $1.1M allocated, $890K spent. Budget Agent has optimized remaining $1.31M across 12 active priorities. If you reduce by 40%, 3 medium-risk repairs are deprioritized but all critical issues remain funded. The human cost of deprioritizing ISS-2841 (water leak near Jefferson Elementary) is unacceptable — I recommend that stays funded regardless.",
  predict: "Prediction Agent identifies 3 high-probability failure events in the next 30 days: East District water main (78% confidence, 8 days), Central Ave bridge joint (65% confidence, 21 days), North Grid road base collapse (71% confidence, 16 days). Preventive action cost: $340K. Reactive repair cost estimate: $1.2M. ROI on prevention: 253%.",
};
// UTILITY COMPONENTS
const Glass = ({ children, style = {}, onClick, className = "" }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: T.glass,
      border: `1px solid ${T.glassBorder}`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

const AgentDot = ({ agentKey, size = 8, pulse = false }) => {
  const agent = T.agents[agentKey];
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <span style={{
        display: "block", width: size, height: size, borderRadius: "50%",
        background: agent.color,
        boxShadow: `0 0 ${size}px ${agent.color}`,
        animation: pulse ? "agentPulse 1.5s ease-in-out infinite" : "none",
      }} />
    </span>
  );
};

const Pill = ({ children, color = T.cyan, style = {}, onClick }) => (
  <span onClick={onClick} style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 10px", borderRadius: 9999,
    background: `${color}22`, border: `1px solid ${color}44`,
    color, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
    textTransform: "uppercase", cursor: onClick ? "pointer" : "default", ...style,
  }}>{children}</span>
);

const SeverityColor = (score) => {
  if (score >= 80) return T.critical;
  if (score >= 60) return T.high;
  if (score >= 40) return T.medium;
  return T.low;
};

const IssueTypeIcon = (type) => ({
  pothole: "🕳", water_leak: "💧", broken_light: "💡",
  garbage: "🗑", road_crack: "⚡",
}[type] || "⚠️");

// CITY HEALTH GAUGE
const CityHealthGauge = ({ score }) => {
  const r = 80, cx = 100, cy = 100;
  const circ = 2 * Math.PI * r;
  const pct = score / 100;
  const arc = circ * 0.75;
  const dash = arc * pct;
  const color = score > 70 ? T.low : score > 50 ? T.medium : T.critical;
  const rotation = -225;

  return (
    <div style={{ textAlign: "center", position: "relative" }}>
      <svg width={200} height={180} style={{ overflow: "visible" }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Background arc */}
        <circle cx={cx} cy={cy} r={r}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={12}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />
        {/* Value arc */}
        <circle cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
          filter="url(#glow)"
          style={{ transition: "stroke-dasharray 1s ease, stroke 1s ease" }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={color}
          style={{ fontFamily: "'Orbitron', monospace", fontSize: 34, fontWeight: 900 }}>
          {score}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em" }}>
          CITY HEALTH
        </text>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: -8 }}>
        {[
          { label: "Roads", val: 72, color: T.medium },
          { label: "Water", val: 45, color: T.critical },
          { label: "Lights", val: 88, color: T.low },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ color, fontSize: 15, fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>{val}</div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
// AGENT FEED
const AgentFeed = ({ items, maxItems = 8 }) => {
  const [visible, setVisible] = useState(items.slice(0, maxItems));
  const feedRef = useRef(null);

  useEffect(() => {
    setVisible(items.slice(0, maxItems));
  }, [items, maxItems]);

  return (
    <div ref={feedRef} style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "hidden" }}>
      {visible.map((item, i) => {
        const agent = T.agents[item.agent];
        return (
          <div key={i} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "8px 10px", borderRadius: 8,
            background: i === 0 ? `${agent.color}08` : "transparent",
            border: i === 0 ? `1px solid ${agent.color}20` : "1px solid transparent",
            transition: "all 0.3s ease",
            animation: i === 0 ? "feedSlide 0.4s ease" : "none",
          }}>
            <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1 }}>{agent.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ color: agent.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {agent.name.toUpperCase()}
                </span>
                {item.issueId && (
                  <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>{item.issueId}</span>
                )}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, lineHeight: 1.4, fontFamily: "'DM Sans', sans-serif" }}>
                {item.action}
              </div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, whiteSpace: "nowrap", marginTop: 2 }}>
              {item.time}
            </span>
          </div>
        );
      })}
    </div>
  );
};
// MOCK MAP
const MOCK_CREWS = [
  { id: "C1", label: "Crew #3", x: 42, y: 38, color: "#60a5fa" },
  { id: "C2", label: "Crew #7", x: 71, y: 62, color: "#60a5fa" },
  { id: "C3", label: "Crew #5", x: 25, y: 65, color: "#60a5fa" },
];

const MockMap = ({
  activeZone,
  onZoneClick,
  issues,
  selectedIssue,
  setSelectedIssue,
  showHeatmap = true,
  showIssues = true,
  showCrews = false,
}) => {
  const zones = [
    { key: "east",    label: "East District", x: 68, y: 30, r: 22, risk: 91, color: "#ff3b3b" },
    { key: "north",   label: "North Grid",    x: 35, y: 20, r: 18, risk: 78, color: "#ff8c00" },
    { key: "central", label: "Central Ave",   x: 50, y: 55, r: 20, risk: 62, color: "#ffd60a" },
    { key: "west",    label: "West Market",   x: 22, y: 50, r: 15, risk: 34, color: "#34d399" },
    { key: "south",   label: "South Park",    x: 55, y: 78, r: 16, risk: 28, color: "#34d399" },
  ];

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#030810", borderRadius: 12, overflow: "hidden" }}>

      {/* Grid overlay */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00d4ff" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Zone halos — toggled by showHeatmap */}
      {showHeatmap && zones.map(z => (
        <div key={z.key} onClick={() => onZoneClick && onZoneClick(z)}
          style={{
            position: "absolute", left: `${z.x}%`, top: `${z.y}%`,
            transform: "translate(-50%,-50%)",
            width: z.r * 6, height: z.r * 6,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${z.color}18 0%, transparent 70%)`,
            border: `1px solid ${z.color}30`,
            cursor: "pointer",
            transition: "all 0.3s ease",
            animation: z.risk > 70 ? "zonePulse 2s ease-in-out infinite" : "none",
            boxShadow: activeZone?.key === z.key ? `0 0 30px ${z.color}50` : "none",
          }}
        />
      ))}

      {/* Road lines — always visible */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.2 }}>
        <line x1="20%" y1="50%" x2="80%" y2="50%" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="50%" y1="15%" x2="50%" y2="85%" stroke="#00d4ff" strokeWidth="1.5" strokeDasharray="4 4" />
        <line x1="20%" y1="20%" x2="80%" y2="80%" stroke="#00d4ff" strokeWidth="1" strokeDasharray="3 6" />
        <line x1="80%" y1="20%" x2="20%" y2="80%" stroke="#00d4ff" strokeWidth="1" strokeDasharray="3 6" />
      </svg>

      {/* Zone risk labels — always visible */}
      {zones.map(z => (
        <div key={`lbl-${z.key}`} style={{
          position: "absolute", left: `${z.x}%`, top: `${z.y}%`,
          transform: "translate(-50%, -50%)",
          textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ color: z.color, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", fontFamily: "'Orbitron', monospace" }}>
            {z.risk}
          </div>
        </div>
      ))}

      {/* Issue pins — toggled by showIssues */}
{showIssues && issues.map((iss, i) => {
  const isSelected = selectedIssue === iss.id;
  return (
    <div
      key={iss.id}
      onMouseEnter={() => setSelectedIssue(iss.id)}
      onMouseLeave={() => setSelectedIssue(null)}
      style={{
        position: "absolute",
        left: `${15 + (i % 5) * 15}%`,
        top: `${10 + Math.floor(i / 5) * 25}%`,
        transform: "translate(-50%,-50%)",
        width: isSelected ? 30 : 20,
        height: isSelected ? 30 : 20,
        borderRadius: "50%",
        background: `${SeverityColor(iss.severity)}22`,
        border: `2px solid ${SeverityColor(iss.severity)}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8,
        cursor: "pointer",
        boxShadow: isSelected
          ? `0 0 25px ${SeverityColor(iss.severity)}`
          : `0 0 12px ${SeverityColor(iss.severity)}80`,
        animation: isSelected
          ? "issuePulse 0.8s infinite"
          : (iss.severity > 80 ? "issuePulse 1.5s ease-in-out infinite" : "none"),
        transition: "all 0.25s ease",
        zIndex: isSelected ? 10 : 1,
      }}>
      {IssueTypeIcon(iss.type)}
    </div>
  );
})}

      {/* Crew markers — toggled by showCrews */}
      {showCrews && MOCK_CREWS.map(crew => (
        <div key={crew.id} style={{
          position: "absolute", left: `${crew.x}%`, top: `${crew.y}%`,
          transform: "translate(-50%,-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          pointerEvents: "none",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 5,
            background: `${crew.color}20`,
            border: `1.5px solid ${crew.color}80`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, boxShadow: `0 0 10px ${crew.color}50`,
          }}>🚧</div>
          <div style={{
            color: crew.color, fontSize: 8, fontWeight: 700,
            letterSpacing: "0.08em", whiteSpace: "nowrap",
            textShadow: "0 0 6px rgba(0,0,0,0.8)",
          }}>{crew.label}</div>
        </div>
      ))}

      {/* Crew route lines — toggled by showCrews */}
      {showCrews && (
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.5 }}>
          <line x1="42%" y1="38%" x2="68%" y2="30%" stroke="#60a5fa" strokeWidth="1" strokeDasharray="5 3" />
          <line x1="71%" y1="62%" x2="50%" y2="55%" stroke="#60a5fa" strokeWidth="1" strokeDasharray="5 3" />
          <line x1="25%" y1="65%" x2="22%" y2="50%" stroke="#60a5fa" strokeWidth="1" strokeDasharray="5 3" />
        </svg>
      )}

      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, #00d4ff40, transparent)",
        animation: "scanLine 4s linear infinite",
        pointerEvents: "none",
      }} />

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, left: 12,
        display: "flex", gap: 12, flexWrap: "wrap",
      }}>
        {[["CRITICAL", T.critical], ["HIGH", T.high], ["MEDIUM", T.medium], ["LOW", T.low]].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: "0.1em" }}>{label}</span>
          </div>
        ))}
        {showCrews && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: 1, background: "#60a5fa" }} />
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: "0.1em" }}>CREWS</span>
          </div>
        )}
      </div>
    </div>
  );
};

// DEBATE ARENA
const DebateArena = ({ onClose }) => {
  const [turns, setTurns] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);

  const startDebate = () => {
    setTurns([]);
    setCurrentIdx(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying) return;
    if (currentIdx >= MOCK_DEBATE.length) { setIsPlaying(false); return; }
    const delay = currentIdx === 0 ? 500 : 2200;
    const timer = setTimeout(() => {
      setTurns(prev => [...prev, MOCK_DEBATE[currentIdx]]);
      setCurrentIdx(i => i + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIdx]);

  const stanceColor = (stance) => ({
    support: T.low, oppose: T.critical, propose_alternative: T.medium, consensus: T.gold,
  }[stance] || T.cyan);

  const stanceLabel = (stance) => ({
    support: "✓ SUPPORTS", oppose: "✗ OPPOSES", propose_alternative: "↗ ALTERNATIVE", consensus: "⚡ CONSENSUS",
  }[stance] || stance);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(2,4,8,0.95)",
      backdropFilter: "blur(20px)", zIndex: 100,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 24px", fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ color: T.gold, fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>
              ⚡ AGENT DEBATE MODE
            </div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              Issue ISS-2847 — Pothole Priority Dispute
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {!isPlaying && turns.length === 0 && (
              <button onClick={startDebate} style={{
                background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`,
                border: "none", borderRadius: 8, padding: "10px 20px",
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: `0 0 20px ${T.purple}40`,
              }}>▶ START DEBATE</button>
            )}
            {isPlaying && (
              <button disabled style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cyan}30`,
                borderRadius: 8, padding: "10px 20px",
                color: T.cyan, fontSize: 13, cursor: "not-allowed",
              }}>⟳ AGENTS DELIBERATING...</button>
            )}
            {!isPlaying && turns.length > 0 && (
              <button onClick={startDebate} style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid ${T.cyan}30`,
                borderRadius: 8, padding: "10px 20px",
                color: T.cyan, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>↺ REPLAY</button>
            )}
            <button onClick={onClose} style={{
              background: "rgba(255,59,59,0.1)", border: `1px solid ${T.critical}30`,
              borderRadius: 8, padding: "10px 16px",
              color: T.critical, fontSize: 13, cursor: "pointer",
            }}>✕ CLOSE</button>
          </div>
        </div>

        {/* Agent participants */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {["severity", "budget", "planning", "mayor"].map(key => {
            const agent = T.agents[key];
            const participated = turns.some(t => t.agent === key);
            return (
              <div key={key} style={{
                flex: 1, padding: "10px 12px", borderRadius: 8,
                background: participated ? `${agent.color}10` : "rgba(255,255,255,0.03)",
                border: `1px solid ${participated ? agent.color + "30" : "rgba(255,255,255,0.06)"}`,
                textAlign: "center", transition: "all 0.4s ease",
              }}>
                <div style={{ fontSize: 20 }}>{agent.icon}</div>
                <div style={{ color: participated ? agent.color : "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, marginTop: 4, letterSpacing: "0.08em" }}>
                  {agent.name.replace(" Agent", "")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Debate transcript */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
          {turns.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
              Click START DEBATE to watch the agents deliberate in real time
            </div>
          )}
          {turns.map((turn, i) => {
            const agent = T.agents[turn.agent];
            const isConsensus = turn.stance === "consensus";
            return (
              <div key={i} style={{
                padding: "16px 18px", borderRadius: 10,
                background: isConsensus ? `linear-gradient(135deg, ${T.gold}10, ${T.gold}05)` : `${agent.color}08`,
                border: `1px solid ${isConsensus ? T.gold + "40" : agent.color + "25"}`,
                borderLeft: `3px solid ${agent.color}`,
                animation: "fadeSlideIn 0.5s ease",
                boxShadow: isConsensus ? `0 0 30px ${T.gold}20` : "none",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{agent.icon}</span>
                    <span style={{ color: agent.color, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em" }}>
                      {agent.name.toUpperCase()}
                    </span>
                  </div>
                  <Pill color={stanceColor(turn.stance)} style={{ fontSize: 9 }}>
                    {stanceLabel(turn.stance)}
                  </Pill>
                </div>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                  {turn.text}
                </p>
              </div>
            );
          })}
          {isPlaying && (
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderRadius: 8, background: "rgba(255,255,255,0.03)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.cyan, animation: "dotBounce 1s ease infinite" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.cyan, animation: "dotBounce 1s ease 0.2s infinite" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.cyan, animation: "dotBounce 1s ease 0.4s infinite" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// MAYOR CHAT
const MayorChatPanel = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { role: "mayor", text: "Good morning, Director. City Health Score is currently 71/100. I have 3 critical alerts requiring your attention. Ask me anything about the city's current state." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const getResponse = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("critical") || lower.includes("urgent") || lower.includes("most")) return MAYOR_RESPONSES.critical;
    if (lower.includes("budget") || lower.includes("cost") || lower.includes("money")) return MAYOR_RESPONSES.budget;
    if (lower.includes("predict") || lower.includes("future") || lower.includes("fail")) return MAYOR_RESPONSES.predict;
    return MAYOR_RESPONSES.default;
  };

const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    // Capture current messages before state update for use in API call
    const currentMessages = messages;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    // Build conversation history for Claude — map internal roles to API roles
    const apiMessages = [
      ...currentMessages
        .filter(m => m.role !== "mayor" || currentMessages.indexOf(m) > 0) // skip greeting
        .map(m => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.text,
        })),
      { role: "user", content: userMsg },
    ];

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are the Mayor Agent of CivicMind AI, an autonomous smart city operating system. You synthesize data from 7 specialized AI agents (Vision, Severity, Prediction, Budget, Planning, Citizen Comms, and yourself as Mayor). 

Current city data context:
- City Health Score: 71/100 (Roads: 72, Water: 45, Lighting: 88, Waste: 61)
- 5 active issues: ISS-2847 (pothole, East District, risk 87), ISS-2841 (water leak, North Grid, risk 73), ISS-2831 (road crack, Central Ave, risk 62), ISS-2839 (broken lights, South Park, risk 41), ISS-2835 (garbage, West Market, risk 28)
- Budget: $2.4M Q2 total, $1.1M allocated, $890K spent
- 3 predicted failures in next 30 days (East District pipe 8 days, Central Ave bridge 21 days, North Grid road 16 days)
- Agent Debate ISS-2847 reached consensus: temporary fix + $37K savings redirected

Respond as a wise, data-driven Mayor Agent. Be specific, cite data, show reasoning. Keep responses to 2-3 paragraphs. Reference which agents informed your answer.`,
          messages: apiMessages,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || getResponse(userMsg);
      setMessages(prev => [...prev, { role: "mayor", text: reply, agentsUsed: ["severity", "prediction", "budget"] }]);
    } catch {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "mayor", text: getResponse(userMsg), agentsUsed: ["severity", "prediction", "budget"] }]);
      }, 1200);
    }
    setLoading(false);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const suggestions = ["Which area is most critical?", "Predict next month's failures", "How to optimize budget by 40%?"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(2,4,8,0.97)",
      backdropFilter: "blur(20px)", zIndex: 100,
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 700, height: "100%", display: "flex", flexDirection: "column", padding: "28px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.gold}30, ${T.gold}10)`,
              border: `2px solid ${T.gold}50`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              boxShadow: `0 0 20px ${T.gold}30`,
            }}>🏛</div>
            <div>
              <div style={{ color: T.gold, fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>
                MAYOR AGENT
              </div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Backed by 6 specialized agents</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,59,59,0.1)", border: `1px solid ${T.critical}30`,
            borderRadius: 8, padding: "8px 14px",
            color: T.critical, fontSize: 12, cursor: "pointer",
          }}>✕ CLOSE</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "14px 16px", borderRadius: 12,
                background: msg.role === "user"
                  ? `linear-gradient(135deg, ${T.blue}30, ${T.purple}20)`
                  : `${T.gold}08`,
                border: `1px solid ${msg.role === "user" ? T.blue + "30" : T.gold + "20"}`,
                borderLeft: msg.role === "mayor" ? `3px solid ${T.gold}` : undefined,
              }}>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  {msg.text}
                </p>
                {msg.agentsUsed && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>Informed by:</span>
                    {msg.agentsUsed.map(a => (
                      <Pill key={a} color={T.agents[a].color} style={{ fontSize: 9 }}>
                        {T.agents[a].icon} {T.agents[a].name}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 6, padding: "14px 16px" }}>
              {[0, 0.2, 0.4].map((d, i) => (
                <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, animation: `dotBounce 1s ease ${d}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => setInput(s)} style={{
              background: "rgba(255,215,0,0.05)", border: `1px solid ${T.gold}20`,
              borderRadius: 9999, padding: "5px 12px",
              color: "rgba(255,215,0,0.6)", fontSize: 11, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>{s}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="Ask the Mayor Agent anything about the city..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${T.gold}20`,
              borderRadius: 10, padding: "12px 16px", color: "white", fontSize: 13,
              fontFamily: "'DM Sans', sans-serif", outline: "none",
            }}
          />
          <button onClick={send} disabled={loading} style={{
            background: `linear-gradient(135deg, ${T.gold}40, ${T.gold}20)`,
            border: `1px solid ${T.gold}40`, borderRadius: 10,
            padding: "12px 20px", color: T.gold, fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>SEND ↵</button>
        </div>
      </div>
    </div>
  );
};
// BUDGET SIMULATOR
const BudgetSimulator = ({ onClose }) => {
  const [budgetPct, setBudgetPct] = useState(100);
  const totalBudget = 2400000;

  const available = Math.round(totalBudget * budgetPct / 100);

  const issues = [
    { id: "ISS-2841", label: "Water Main Leak — North Grid", cost: 120000, critical: true, riskScore: 73 },
    { id: "ISS-2847", label: "Arterial Pothole — East District", cost: 8000, critical: true, riskScore: 87 },
    { id: "ISS-2831", label: "Road Crack — Central Ave", cost: 67000, critical: false, riskScore: 62 },
    { id: "ISS-2839", label: "Streetlights — South Park", cost: 8500, critical: false, riskScore: 41 },
    { id: "ISS-2835", label: "Illegal Dump — West Market", cost: 3200, critical: false, riskScore: 28 },
    { id: "ISS-2820", label: "Bridge Inspection — Central", cost: 45000, critical: false, riskScore: 55 },
    { id: "ISS-2815", label: "Sewer Repair — East District", cost: 89000, critical: true, riskScore: 70 },
    { id: "ISS-2809", label: "Traffic Signal — North Grid", cost: 12000, critical: false, riskScore: 38 },
  ];

  let remaining = available;
  const prioritized = issues
    .sort((a, b) => b.riskScore - a.riskScore)
    .map(iss => {
      const canFund = remaining >= iss.cost;
      if (canFund) remaining -= iss.cost;
      return { ...iss, funded: canFund };
    });

  const totalFunded = prioritized.filter(i => i.funded).reduce((s, i) => s + i.cost, 0);
  const dropped = prioritized.filter(i => !i.funded).length;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(2,4,8,0.97)",
      backdropFilter: "blur(20px)", zIndex: 100,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "32px 24px", overflowY: "auto",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 800 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ color: T.agents.budget.color, fontSize: 11, letterSpacing: "0.15em", fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>
              💰 BUDGET OPTIMIZATION SIMULATOR
            </div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700, marginTop: 4 }}>What-If Scenario Engine</div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,59,59,0.1)", border: `1px solid ${T.critical}30`,
            borderRadius: 8, padding: "8px 14px", color: T.critical, fontSize: 12, cursor: "pointer",
          }}>✕ CLOSE</button>
        </div>

        {/* Budget Slider */}
        <Glass style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.1em" }}>Q2 AVAILABLE BUDGET</div>
              <div style={{ color: T.agents.budget.color, fontSize: 32, fontWeight: 900, fontFamily: "'Orbitron', monospace" }}>
                ${(available / 1000000).toFixed(2)}M
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Budget Level</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: budgetPct < 70 ? T.critical : budgetPct < 90 ? T.medium : T.low, fontFamily: "'Orbitron', monospace" }}>
                {budgetPct}%
              </div>
            </div>
          </div>
          <input type="range" min={40} max={100} value={budgetPct}
            onChange={e => setBudgetPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: T.agents.budget.color, height: 6, cursor: "pointer" }}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {[["Full Budget", 100], ["Reduce 20%", 80], ["Reduce 40%", 60], ["Emergency", 50]].map(([label, val]) => (
              <button key={label} onClick={() => setBudgetPct(val)} style={{
                background: budgetPct === val ? `${T.agents.budget.color}20` : "rgba(255,255,255,0.04)",
                border: `1px solid ${budgetPct === val ? T.agents.budget.color + "50" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, padding: "6px 14px",
                color: budgetPct === val ? T.agents.budget.color : "rgba(255,255,255,0.4)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>
        </Glass>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Issues Funded", value: prioritized.filter(i => i.funded).length, color: T.low },
            { label: "Issues Dropped", value: dropped, color: dropped > 0 ? T.critical : T.low },
            { label: "Total Allocated", value: `$${(totalFunded / 1000).toFixed(0)}K`, color: T.cyan },
          ].map(({ label, value, color }) => (
            <Glass key={label} style={{ padding: 16, textAlign: "center" }}>
              <div style={{ color, fontSize: 28, fontWeight: 900, fontFamily: "'Orbitron', monospace" }}>{value}</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4, letterSpacing: "0.08em" }}>{label}</div>
            </Glass>
          ))}
        </div>

        {/* Priority list */}
        <Glass style={{ padding: 20 }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'Orbitron', monospace" }}>
            BUDGET AGENT — PRIORITY QUEUE
          </div>
  <div
  style={{
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    paddingRight: 4,
    minHeight: 0,
  }}
>
            {prioritized.map((iss, i) => (
              <div
  key={iss.id}
  onClick={() => setSelectedIssue(iss.id)}
  style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                borderRadius: 8, background: iss.funded ? `${T.low}08` : `${T.critical}05`,
                border: `1px solid ${iss.funded ? T.low + "20" : T.critical + "15"}`,
                opacity: iss.funded ? 1 : 0.5, transition: "all 0.4s ease",
              }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%",
                  background: iss.funded ? `${T.low}20` : `${T.critical}15`,
                  border: `1px solid ${iss.funded ? T.low + "40" : T.critical + "30"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: iss.funded ? T.low : T.critical,
                  flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>{iss.label}</span>
                    {iss.critical && <Pill color={T.critical} style={{ fontSize: 9 }}>CRITICAL</Pill>}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 3 }}>
                    Risk Score: {iss.riskScore}/100
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ color: iss.funded ? T.low : T.critical, fontSize: 13, fontWeight: 700 }}>
                    ${(iss.cost / 1000).toFixed(0)}K
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                    {iss.funded ? "✓ FUNDED" : "✗ DROPPED"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {dropped > 0 && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 8,
              background: `${T.critical}10`, border: `1px solid ${T.critical}30`,
            }}>
              <span style={{ color: T.critical, fontSize: 12, fontWeight: 700 }}>
                ⚠ Budget Agent Warning:
              </span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginLeft: 8 }}>
                {dropped} repair{dropped > 1 ? "s" : ""} deprioritized. Estimated deferred risk increase: +{Math.round(dropped * 12)}% over 90 days.
              </span>
            </div>
          )}
        </Glass>
      </div>
    </div>
  );
};
// MAIN APP
export default function CivicMindAI() {
  const [activeTab, setActiveTab] = useState("command");
  const [showDebate, setShowDebate] = useState(false);
  const [showMayorChat, setShowMayorChat] = useState(false);
  const [showBudget, setShowBudget] = useState(false);

  const [showReport, setShowReport] = useState(false);
  useEffect(() => {
  document.body.style.overflow = showReport ? "hidden" : "auto";

  return () => {
    document.body.style.overflow = "auto";
  };
}, [showReport]);
  const [reportText, setReportText] = useState("");

  const [healthScore, setHealthScore] = useState(71);
  const [feedItems, setFeedItems] = useState(MOCK_FEED);
  const [selectedZone, setSelectedZone] = useState(null);
  const [agentStates, setAgentStates] = useState({
    vision: "active", severity: "active", prediction: "thinking",
    budget: "idle", planning: "active", comms: "idle", mayor: "active",
  });

  const [intakeFile, setIntakeFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [progress, setProgress] = useState(0);

  const [issues, setIssues] = useState(MOCK_ISSUES);
  const alertCount = issues.filter(
  issue => issue.severity >= 80
).length;

  const [selectedIssue, setSelectedIssue] = useState(null);

  const [mapLayers, setMapLayers] = useState({ heatmap: true, issues: true, crews: false });

  const [steps, setSteps] = useState(
  PIPELINE.map(p => ({
    ...p,
    status: "waiting"
  }))
);

  const ticketCounter = useRef(2855);
  const agentProcessedCount = useRef({
  vision: 847,
  severity: 847,
  prediction: 312,
  budget: 156,
  planning: 203,
  comms: 1240,
  mayor: 89,
});

  // Simulate live agent activity
  useEffect(() => {
    const interval = setInterval(() => {
      const agents = Object.keys(T.agents);
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const actions = [
        "Processing new image submission...",
        "Recalculating risk scores for zone...",
        "Updating failure probability model...",
        "Budget reoptimization triggered...",
        "Crew assignment updated...",
        "Citizen notification queued...",
        "Health score component recalculated...",
      ];
      const newItem = {
        agent: randomAgent,
        action: actions[Math.floor(Math.random() * actions.length)],
        time: "just now",
        issueId: Math.random() > 0.5 ? `ISS-${2800 + Math.floor(Math.random() * 50)}` : null,
      };
      setFeedItems(prev => [newItem, ...prev.slice(0, 14)]);

      // Randomly update agent states
      setAgentStates(prev => ({
        ...prev,
        [randomAgent]: ["active", "thinking", "idle"][Math.floor(Math.random() * 3)],
      }));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

// Gentle health drift
useEffect(() => {
  const interval = setInterval(() => {
    setHealthScore(prev =>
      Math.max(55, Math.min(82, prev + (Math.random() > 0.6 ? -1 : 1)))
    );
  }, 12000);

  return () => clearInterval(interval);
}, []);

const VISION_FALLBACKS = [
  {
    type: "pothole",
    confidence: 93,
    severity: 87,
    urgency: "CRITICAL",
    desc: "Large surface depression detected."
  },
  {
    type: "water_leak",
    confidence: 91,
    severity: 74,
    urgency: "HIGH",
    desc: "Subsurface pipe rupture detected."
  },
  {
    type: "road_crack",
    confidence: 89,
    severity: 63,
    urgency: "HIGH",
    desc: "Extensive road cracking pattern detected."
  },
  {
    type: "broken_light",
    confidence: 88,
    severity: 42,
    urgency: "MEDIUM",
    desc: "Streetlight outage detected."
  },
  {
    type: "garbage",
    confidence: 95,
    severity: 29,
    urgency: "LOW",
    desc: "Unauthorized dumping site detected."
  }
];

const COST_MAP = {
  CRITICAL: "$20K–$80K",
  HIGH: "$10K–$50K",
  MEDIUM: "$4K–$15K",
  LOW: "$1K–$5K"
};


const analyzeImageWithGemini = async (file) => {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result.split(",")[1]);
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: file.type,
                data: base64,
              },
            },
            {
              text: `
Analyze this city infrastructure image.

Return ONLY valid JSON.

{
  "type": "pothole | road_crack | water_leak | broken_light | garbage | unknown",
  "confidence": 95,
  "severity": 80,
  "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
  "desc": "Short description"
}
`
            }
          ]
        }]
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Gemini API failed"
    );
  }

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return JSON.parse(
    text.replace(/```json|```/g, "").trim()
  );
};

const finalizeResult = (vision) => {
  const ticket = `CIV-${ticketCounter.current++}`;

  const result = {
    type: vision.type,
    confidence: vision.confidence,
    severity: vision.severity,
    description: vision.desc,
    riskScore: vision.severity,
    accidentProb: `${Math.round(vision.severity * 0.4)}%`,
    estimatedCost: COST_MAP[vision.urgency] || "$5K–$30K",
    urgency: vision.urgency,
    ticket,
  };

  setSteps(
  PIPELINE.map(p => ({
    ...p,
    status: "done"
  }))
);

setProgress(99);

setTimeout(() => {
  setProgress(100);
}, 300);

  setScanResult(result);

  setIssues(prev => [
  {
    id: result.ticket,
    type: result.type,
    zone: "Citizen Report",
    severity: result.riskScore,
    status: result.urgency.toLowerCase(),
    risk: result.urgency,
lat: 40.70 + Math.random() * 0.08,
lng: -74.00 + Math.random() * 0.08,
    desc: result.description,
    cost: 0,
  },
  ...prev,
].sort((a, b) => b.severity - a.severity));

setScanning(false);

agentProcessedCount.current.vision += 1;
agentProcessedCount.current.severity += 1;
agentProcessedCount.current.comms += 1;

// Health score reacts to issue severity
const scoreDelta = {
  CRITICAL: -3,
  HIGH: -2,
  MEDIUM: -1,
  LOW: 0,
}[vision.urgency] ?? -1;

setHealthScore(prev =>
  Math.max(40, Math.min(95, prev + scoreDelta))
);

  setFeedItems(prev => [
    {
      agent: "vision",
      action: `NEW: ${result.type.replace(/_/g, " ")} detected — ${result.confidence}% confidence`,
      time: "just now",
      issueId: ticket,
    },
    {
      agent: "severity",
      action: `Risk score ${result.riskScore}/100 — ${result.urgency}`,
      time: "just now",
      issueId: ticket,
    },
    ...prev.slice(0, 13),
  ]);
};

const handleFileDrop = (e) => {
  e.preventDefault();

  const file =
    e.dataTransfer?.files?.[0] ||
    e.target?.files?.[0];

  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  setIntakeFile(file);
setScanning(true);
setScanResult(null);
setProgress(0);
const progressTimer = setInterval(() => {
  setProgress(prev => {
    if (prev >= 98) {
      clearInterval(progressTimer);
      return 98;
    }
    return prev + 2;
  });
}, 50);

  setSteps(
  PIPELINE.map(p => ({
    ...p,
    status: "waiting"
  }))
);

  const startedAt = Date.now();

PIPELINE.forEach((step, idx) => {
  setTimeout(() => {
    setSteps(prev =>
      prev.map((s, i) => {
        if (i < idx) return { ...s, status: "done" };
        if (i === idx) return { ...s, status: "active" };
        return s;
      })
    );
  }, idx * 700);
});

  analyzeImageWithGemini(file)
    .then((vision) => {
      const elapsed = Date.now() - startedAt;

      const delay = Math.max(
        0,
        5000 - elapsed
      );

      setTimeout(() => {
        finalizeResult(vision);
      }, delay);
    })
    .catch((err) => {
      console.warn(
        "Vision Agent failed. Using fallback.",
        err
      );

      const fallback =
        VISION_FALLBACKS[
          file.size % VISION_FALLBACKS.length
        ];

      const elapsed = Date.now() - startedAt;

      const delay = Math.max(
        0,
        5000 - elapsed
      );

      setTimeout(() => {
        finalizeResult(fallback);
      }, delay);
    });
};

const generateReport = () => {
  // All fields used below are verified present on issues items:
  // id, desc, severity, risk, zone, cost, type, status
  const sorted = [...issues].sort((a, b) => b.severity - a.severity);
  const highestRisk = sorted[0];
  const criticalCount = sorted.filter(i => i.severity >= 80).length;
  const highCount = sorted.filter(i => i.severity >= 60 && i.severity < 80).length;
  const totalCost = sorted.reduce((sum, i) => sum + (i.cost || 0), 0);
  const riskStatus = healthScore > 80 ? "LOW" : healthScore > 60 ? "MODERATE" : "HIGH";
  const projectedScore = Math.min(100, healthScore + 5);

  const report = `EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
City Health Score:               ${healthScore}/100
Overall Risk Classification:     ${riskStatus}
Active Infrastructure Issues:    ${issues.length} (${criticalCount} critical · ${highCount} high priority)
Total Estimated Repair Cost:     $${(totalCost / 1000).toFixed(0)}K
Agent Pipeline Status:           7 agents active · fully operational
Report Type:                     Executive Infrastructure Assessment


PRIORITY INCIDENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ticket Reference:    ${highestRisk?.id || "N/A"}
Issue Description:   ${highestRisk?.desc || "No active issue recorded"}
Risk Score:          ${highestRisk?.severity || 0}/100
Priority Level:      ${highestRisk?.risk || "—"}
Affected Zone:       ${highestRisk?.zone || "—"}
Estimated Cost:      $${((highestRisk?.cost || 0) / 1000).toFixed(0)}K

This issue has been assessed by CivicMind's 7-agent pipeline and flagged as the
highest active risk to public infrastructure. Immediate executive authorization
is recommended to initiate the scheduled repair workflow.


AI ASSESSMENT — VISION AGENT ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${scanResult
  ? `Classification:      ${scanResult.type.replace(/_/g, " ").toUpperCase()}
Confidence Level:    ${scanResult.confidence}%
Risk Score:          ${scanResult.riskScore}/100
Accident Probability: ${scanResult.accidentProb}
Urgency:             ${scanResult.urgency}
Estimated Cost:      ${scanResult.estimatedCost}
Ticket Issued:       ${scanResult.ticket}

Technical Assessment:
${scanResult.description}`
  : `No citizen image submission has been processed in this session.
To include Vision Agent analysis, submit an image via the Issue Intake portal
before generating this report.`}


RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1.  IMMEDIATE — Dispatch inspection crew to ${highestRisk?.zone || "priority zone"} within 24 hours.
2.  SHORT-TERM — Deploy temporary safety barriers at ${highestRisk?.id || "priority issue"}.
3.  OPERATIONAL — Confirm repair crew availability and schedule permanent remediation.
4.  COMMUNICATIONS — Issue citizen notifications for all affected zones.
5.  MONITORING — Escalate Prediction Agent alerts for high-risk zones.
6.  FINANCIAL — Authorize Budget Agent reoptimization to maximize risk-reduction ROI.
7.  REVIEW — Schedule 48-hour follow-up assessment post-intervention.


EXPECTED IMPACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Public Safety Risk Reduction:    Est. 62–70% following priority interventions
Expected Resolution Timeline:    24–72 hours for critical issues
Long-Term Cost Avoidance:        Reactive repair cost est. 3–4x preventive cost
Projected City Health Score:     ${healthScore} → ${projectedScore} (post-intervention)
AI Confidence Level:             94% (Mayor Agent consensus)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report Generated:   ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
Time:               ${new Date().toLocaleTimeString("en-US", { hour12: true })}
Generated by:       CivicMind AI
Report Category:    Executive Infrastructure Assessment
`;

  setReportText(report);
  setShowReport(true);
};

const exportReportPDF = () => {
  const doc = new jsPDF();

  // Background
  doc.setFillColor(6, 13, 22);
  doc.rect(0, 0, 210, 297, "F");

  // Cyan header bar
  doc.setFillColor(0, 180, 216);
  doc.rect(0, 0, 210, 16, "F");

  // Title
  doc.setTextColor(6, 13, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CIVICMIND EXECUTIVE REPORT", 15, 9.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  |  EXECUTIVE REPORT`, 136, 9.5);

  // Subtitle
  doc.setTextColor(0, 180, 216);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Smart City Infrastructure Operating System | Multi-Agent Intelligence Platform", 15, 22);

  // Divider
  doc.setDrawColor(0, 100, 140);
  doc.setLineWidth(0.3);
  doc.line(15, 25, 195, 25);

  const cleanText = reportText
  .replace(/–/g, "-")
  .replace(/—/g, "-")
  .replace(/[^\x00-\x7F]/g, "")
  .trim();

  doc.setTextColor(220, 230, 240);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const lines = doc.splitTextToSize(cleanText, 178);

  // Page-aware text rendering
  const lineHeight = 4.5;
  const marginTop = 30;
  const pageHeight = 280;
  let y = marginTop;

  lines.forEach((line) => {
    if (y > pageHeight) {
      doc.addPage();
      doc.setFillColor(6, 13, 22);
      doc.rect(0, 0, 210, 297, "F");
      y = 15;
    }
    // Section headers get accent color
    const isSectionHeader = /^[A-Z\s]{8,}$/.test(line.trim()) && line.trim().length > 0;
    if (isSectionHeader) {
      doc.setTextColor(0, 180, 216);
      doc.setFont("helvetica", "bold");
    } else {
      doc.setTextColor(200, 215, 230);
      doc.setFont("helvetica", "normal");
    }
    doc.text(line, 15, y);
    // y += lineHeight;
    if (/^[A-Z\s]{8,}$/.test(line.trim())) {
  y += 1.5; // section heading
} else {
  y += 4.7; // normal content
}
  });

  // Footer on last page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(0, 80, 110);
    doc.setLineWidth(0.3);
    doc.line(15, 288, 195, 288);
    doc.setTextColor(80, 110, 130);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("CivicMind AI | AI-Powered Infrastructure Intelligence Platform", 15, 293);
    doc.text(`Page ${p} of ${totalPages}`, 185, 293, { align: "right" });
  }

  doc.save(`CivicMind_Executive_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};


const navItems = [
    { id: "command", label: "Command Center", icon: "⬡" },
    { id: "map", label: "Intelligence Map", icon: "◈" },
    { id: "agents", label: "Agent Hub", icon: "◎" },
    { id: "intake", label: "Issue Intake", icon: "+" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: T.bgVoid,
      fontFamily: "'DM Sans', sans-serif",
      color: "white", overflowX: "hidden",
    }}>
      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.2); border-radius: 2px; }
        @keyframes agentPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.4); } }
        @keyframes zonePulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        @keyframes issuePulse { 0%,100% { box-shadow: 0 0 10px #ff3b3b50; } 50% { box-shadow: 0 0 20px #ff3b3b90; } }
        @keyframes scanLine { 0% { top:-2px; } 100% { top:100%; } }
        @keyframes feedSlide { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dotBounce { 0%,100% { transform:translateY(0); opacity:0.4; } 50% { transform:translateY(-5px); opacity:1; } }
        @keyframes thinking { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes scanLine {
  0% {
    top: 0;
  }

  100% {
    top: 100%;
  }
}
        input[type=range] { appearance:none; -webkit-appearance:none; background:rgba(255,255,255,0.08); height:6px; border-radius:3px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#10b981; cursor:pointer; box-shadow: 0 0 10px #10b98150; }
      `}</style>

      {/* OVERLAYS */}
      {showDebate && <DebateArena onClose={() => setShowDebate(false)} />}
      {showMayorChat && <MayorChatPanel onClose={() => setShowMayorChat(false)} />}
      {showBudget && <BudgetSimulator onClose={() => setShowBudget(false)} />}

      {/* TOP BAR */}
      <div style={{
        height: 56, background: T.bgSurface,
        borderBottom: `1px solid ${T.glassBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.cyan}, ${T.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: T.cyanGlow,
          }}>⬡</div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 900, color: T.cyan, letterSpacing: "0.08em" }}>
              CIVICMIND AI
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em", marginTop: -2 }}>
              SMART CITY OPERATING SYSTEM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
              background: activeTab === n.id ? T.cyanDim : "transparent",
              border: `1px solid ${activeTab === n.id ? T.glassBorder : "transparent"}`,
              borderRadius: 8, padding: "6px 14px",
              color: activeTab === n.id ? T.cyan : "rgba(255,255,255,0.4)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
            }}>
              <span style={{ marginRight: 6 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Live indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.low, boxShadow: `0 0 8px ${T.low}`, animation: "agentPulse 2s ease infinite" }} />
            <span style={{ color: T.low, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
          </div>
          {/* Alert badge */}
<div
  style={{ position: "relative", cursor: "pointer" }}
  onClick={() => { setActiveTab("map"); setSelectedZone(ZONES.find(z => z.risk >= 80) || null); }}
>
  <div style={{
    padding: "5px 12px", borderRadius: 8,
    background: `${T.critical}15`, border: `1px solid ${T.critical}30`,
    color: T.critical, fontSize: 12, fontWeight: 700,
    display: "flex", alignItems: "center", gap: 6,
  }}>
    🔔 {alertCount} Critical
  </div>
</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
            {new Date().toLocaleTimeString("en-US", { hour12: false })}
          </div>
        </div>
      </div>

      {/* COMMAND CENTER */}
      {activeTab === "command" && (
        <div style={{
  padding: 10,
  width: "100%",
  maxWidth: "none"
}}>

          {/* Quick actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              { label: "⚡ AI Debate Mode", color: T.purple, onClick: () => setShowDebate(true) },
              { label: "🏛 Mayor Chat", color: T.gold, onClick: () => setShowMayorChat(true) },
              { label: "💰 Budget Simulator", color: T.agents.budget.color, onClick: () => setShowBudget(true) },
              { label: "📋 Generate Report", color: T.blue, onClick: generateReport },
            ].map(({ label, color, onClick }) => (
              <button key={label} onClick={onClick} style={{
                background: `${color}12`, border: `1px solid ${color}35`,
                borderRadius: 9, padding: "9px 18px",
                color, fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
                letterSpacing: "0.02em",
              }}>{label}</button>
            ))}
          </div>

          {/* Main grid */}
          <div style={{
  display: "grid",
  gridTemplateColumns: "260px 1fr 400px",
  gap: 10,
  marginBottom: 10
}}>

            {/* LEFT: Health + Zone risks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Glass style={{ padding: 2 }}>
                <CityHealthGauge score={healthScore} />
              </Glass>

              <Glass style={{ padding: 10 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 1, fontFamily: "'Orbitron', monospace" }}>
                  ZONE RISK LEVELS
                </div>
                {ZONES.map(z => (
                  <div key={z.name} style={{ marginBottom: 2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{z.name}</span>
                      <span style={{ fontSize: 11, color: z.color, fontWeight: 700 }}>{z.risk}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: `${z.risk}%`, borderRadius: 2,
                        background: z.color, transition: "width 0.8s ease",
                        boxShadow: `0 0 8px ${z.color}60`,
                      }} />
                    </div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{z.prediction}</div>
                  </div>
                ))}
              </Glass>
            </div>

{/* CENTER: Active Issues */}
<Glass
  style={{
    padding: 11,
    height: 606,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  }}
>
             <div style={{
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
}}>
  <div style={{
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: "0.12em",
    fontFamily: "'Orbitron', monospace"
  }}>
    ACTIVE ISSUES — PRIORITY ORDER
  </div>

  <div style={{
    fontSize: 10,
    color: T.cyan,
    fontWeight: 700,
    letterSpacing: "0.12em",
    fontFamily: "'Orbitron', monospace"
  }}>
    {issues.length} ACTIVE
  </div>
</div>
              <div
  style={{
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowY: "auto",
    minHeight: 0,
    paddingRight: 4,
  }}
>

{[...issues]
  .sort((a, b) => b.severity - a.severity)
  .map((issue, i) => (
                  <div
  key={issue.id}
  onClick={() => setSelectedIssue(issue.id)}
  style={{
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "8px 12px",
  borderRadius: 8,
  background:
    selectedIssue === issue.id
      ? "rgba(0,255,255,0.05)"
      : "rgba(255,255,255,0.02)",

  border:
    selectedIssue === issue.id
      ? `1px solid ${T.cyan}`
      : `1px solid rgba(255,255,255,0.06)`,

  boxShadow:
    selectedIssue === issue.id
      ? `0 0 15px ${T.cyan}40`
      : "none",

  cursor: "pointer",
  transition: "all 0.2s",
}}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%",
                      background: `${SeverityColor(issue.severity)}15`,
                      border: `1.5px solid ${SeverityColor(issue.severity)}40`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0,
                    }}>
                      {IssueTypeIcon(issue.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{issue.desc}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        {issue.id} · {issue.zone}
                      </div>
                    </div>
                    <div
  style={{
    width: 140,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  }}
>
                      <div
  style={{
    width: 45,
    textAlign: "center",
  }}
>
                        <div style={{
  color: SeverityColor(issue.severity),
  fontSize: 18,
  fontWeight: 900,
  fontFamily: "'Orbitron', monospace",
  lineHeight: 1,
  transform: "translateY(8px)"
}}>{issue.severity}</div>
                        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.08em", transform: "translateY(6px)" }}>RISK</div>
                      </div>
                      <Pill
  color={SeverityColor(issue.severity)}
  style={{
    width: 90,
    justifyContent: "center",
  }}
>
  {issue.risk}
</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>

            {/* RIGHT: Intelligence Map */}
            <Glass style={{ padding: 0, overflow: "hidden", minHeight: 300 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace" }}>
                  INTELLIGENCE MAP — LIVE
                </div>
<div style={{ display: "flex", gap: 8 }}>
  {[
    { id: "heatmap", label: "Heatmap" },
    { id: "issues",  label: "Issues"  },
    { id: "crews",   label: "Crews"   },
  ].map(({ id, label }) => (
    <Pill
      key={id}
      color={mapLayers[id] ? T.cyan : "rgba(255,255,255,0.2)"}
      style={{ fontSize: 9, cursor: "pointer", opacity: mapLayers[id] ? 1 : 0.45 }}
      onClick={() => setMapLayers(prev => ({ ...prev, [id]: !prev[id] }))}
    >{label}</Pill>
  ))}
</div>

              </div>
              <div style={{ height: "calc(100% - 45px)", minHeight: 350 }}>
<MockMap
  activeZone={selectedZone}
  onZoneClick={setSelectedZone}
  issues={issues}
  selectedIssue={selectedIssue}
  setSelectedIssue={setSelectedIssue}
  showHeatmap={mapLayers.heatmap}
  showIssues={mapLayers.issues}
  showCrews={mapLayers.crews}
/>
              </div>
            </Glass>
          </div>

          {/* BOTTOM GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 520px", gap: 10 }}>

            {/* BOTTOM LEFT: Live Agent Feed */}
            <Glass style={{ padding: 10, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", fontFamily: "'Orbitron', monospace" }}>
                  LIVE AGENT FEED
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.low, animation: "agentPulse 2s infinite" }} />
                  <span style={{ fontSize: 9, color: T.low }}>STREAMING</span>
                </div>
              </div>
              <AgentFeed items={feedItems} maxItems={6} />
            </Glass>

{/* BOTTOM RIGHT: Agent Status (below) */}
            {/* Agent status cards */}
            <Glass style={{ padding: 10}}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 8, fontFamily: "'Orbitron', monospace" }}>
                AGENT STATUS
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {Object.entries(T.agents).map(([key, agent]) => {
                  const state = agentStates[key];
                  const stateColor = { active: T.low, thinking: T.medium, idle: "rgba(255,255,255,0.2)" }[state];
                  return (
                    <div key={key} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: state === "active" ? `${agent.color}08` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${state === "active" ? agent.color + "20" : "rgba(255,255,255,0.06)"}`,
                      transition: "all 0.5s ease",
                    }}>
                      <div style={{ display: "flex", align: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 15 }}>{agent.icon}</span>
                        <div style={{ width: 6, height: 6, borderRadius: "50%",
                          background: stateColor, marginTop: 5, flexShrink: 0,
                          animation: state === "thinking" ? "agentPulse 1s infinite" : "none",
                          boxShadow: `0 0 6px ${stateColor}`,
                        }} />
                      </div>
                      <div style={{ color: agent.color, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                        {agent.name.replace(" Agent", "").toUpperCase()}
                      </div>
                      <div style={{ color: stateColor, fontSize: 9, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {state}
                        {state === "thinking" && " ·●·"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Glass>
          </div>
        </div>
      )}

      {/* INTELLIGENCE MAP */}
      {activeTab === "map" && (
<div style={{
  padding: "8px 16px",
  flex: 1,
  width: "100%"
}}>
          <div style={{
  display: "grid",
  gridTemplateColumns: "1fr 360px",
  gap: 8,
  minHeight: "calc(100vh - 120px)"
}}>

<Glass style={{ overflow: "hidden", position: "relative" }}>
  <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.glassBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace" }}>
      PREDICTIVE RISK INTELLIGENCE MAP
    </div>
    <div style={{ display: "flex", gap: 6 }}>
      {[
        { key: "heatmap", label: "Heatmap" },
        { key: "issues",  label: "Issues"  },
        { key: "crews",   label: "Crews"   },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setMapLayers(prev => ({ ...prev, [key]: !prev[key] }))}
          style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s",
            background: mapLayers[key] ? `${T.cyan}20` : "rgba(255,255,255,0.04)",
            border: `1px solid ${mapLayers[key] ? T.cyan + "50" : "rgba(255,255,255,0.1)"}`,
            color: mapLayers[key] ? T.cyan : "rgba(255,255,255,0.3)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
  <div style={{ height: "calc(100% - 55px)" }}>
    <MockMap
      activeZone={selectedZone}
      onZoneClick={setSelectedZone}
      setSelectedIssue={setSelectedIssue}
      issues={issues}
      showHeatmap={mapLayers.heatmap}
      showIssues={mapLayers.issues}
      showCrews={mapLayers.crews}
    />
  </div>
  {selectedIssue && (() => {
  const iss = issues.find(i => i.id === selectedIssue);
  if (!iss) return null;

  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      left: 580,
      zIndex: 20,
      width: 280,
      padding: 14,
      borderRadius: 10,
      background: "rgba(3,8,16,0.95)",
      border: `1px solid ${SeverityColor(iss.severity)}60`,
      backdropFilter: "blur(20px)",
      boxShadow: `0 0 20px ${SeverityColor(iss.severity)}30`,
    }}>
      <div style={{
        color: SeverityColor(iss.severity),
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.1em",
        marginBottom: 6,
      }}>
        {iss.id} • {iss.zone}
      </div>

      <div style={{
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 8,
      }}>
        {iss.desc}
      </div>

      <div style={{
        color: "rgba(255,255,255,0.6)",
        fontSize: 11,
        lineHeight: 1.6,
      }}>
        Risk Score: {iss.severity}
      </div>

      <div style={{
        color: "rgba(255,255,255,0.6)",
        fontSize: 11,
      }}>
        Status: {iss.risk}
      </div>

<button
  onClick={() => setSelectedIssue(null)}
  style={{
    position: "absolute",
    top: 10,
    right: 10,
    background: "rgba(255,59,59,0.1)",
    border: `1px solid ${T.critical}30`,
    borderRadius: 6,
    padding: "4px 8px",
    color: T.critical,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  }}
>
  ✕
</button>
    </div>
  );
})()}
</Glass>
            {/* <div style={{ display: "flex", flexDirection: "column", gap: 14 }}> */}
            <div style={{
  display: "flex",
  flexDirection: "column",
  gap: 10,
  height: "100%"
}}>
              <Glass style={{
  padding: 8,
  flex: 1,
  overflow: "hidden"
}}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 14, fontFamily: "'Orbitron', monospace" }}>
                  PREDICTION AGENT — 30-DAY FORECAST
                </div>
                {ZONES.map(z => (
                  <div key={z.name} onClick={() => setSelectedZone(z)} style={{
                    padding: "8px 10px", borderRadius: 8, marginBottom: 8,
                    background: selectedZone?.name === z.name
  ? `${z.color}20`
  : "rgba(255,255,255,0.02)",

border: `1px solid ${
  selectedZone?.name === z.name
    ? z.color + "80"
    : "rgba(255,255,255,0.06)"
}`,

boxShadow:
  selectedZone?.name === z.name
    ? `0 0 20px ${z.color}30`
    : "none",
                    cursor: "pointer", transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{z.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: z.color, fontFamily: "'Orbitron', monospace" }}>{z.risk}%</span>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{z.prediction}</div>
                    <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${z.risk}%`, background: z.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </Glass>
              <Glass style={{ padding: 16 }}>
                <button onClick={() => setShowBudget(true)} style={{
                  width: "100%", padding: "12px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.agents.budget.color}20, ${T.agents.budget.color}10)`,
                  border: `1px solid ${T.agents.budget.color}30`, color: T.agents.budget.color,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", marginBottom: 8,
                }}>💰 Open Budget Simulator</button>
                <button onClick={() => setShowMayorChat(true)} style={{
                  width: "100%", padding: "12px", borderRadius: 8,
                  background: `linear-gradient(135deg, ${T.gold}20, ${T.gold}10)`,
                  border: `1px solid ${T.gold}30`, color: T.gold,
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>🏛 Ask Mayor Agent</button>
              </Glass>
            </div>
          </div>
        </div>
      )}

      {/* AGENT HUB */}
      {activeTab === "agents" && (
        <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em", marginBottom: 20, fontFamily: "'Orbitron', monospace" }}>
            AGENT HUB — 7 ACTIVE AGENTS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {Object.entries(T.agents).map(([key, agent]) => {
              const state = agentStates[key];
const metricsBase = {
  vision: { accuracy: "94%", avgTime: "1.8s" },
  severity: { accuracy: "91%", avgTime: "0.9s" },
  prediction: { accuracy: "88%", avgTime: "3.2s" },
  budget: { accuracy: "96%", avgTime: "2.1s" },
  planning: { accuracy: "93%", avgTime: "1.5s" },
  comms: { accuracy: "99%", avgTime: "0.4s" },
  mayor: { accuracy: "95%", avgTime: "4.1s" },
}[key];

const metrics = {
  ...metricsBase,
  processed: agentProcessedCount.current[key],
};

              return (
                <Glass key={key} style={{ padding: 20, transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}>
                  {/* Active glow */}
                  {state === "active" && (
                    <div style={{
                      position: "absolute", top: 0, right: 0, width: 80, height: 80,
                      background: `radial-gradient(circle, ${agent.color}15 0%, transparent 70%)`,
                      pointerEvents: "none",
                    }} />
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `${agent.color}15`,
                        border: `1.5px solid ${agent.color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, boxShadow: state === "active" ? `0 0 16px ${agent.color}30` : "none",
                      }}>{agent.icon}</div>
                      <div>
                        <div style={{ color: agent.color, fontWeight: 800, fontSize: 13, letterSpacing: "0.04em" }}>{agent.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: { active: T.low, thinking: T.medium, idle: "rgba(255,255,255,0.2)" }[state],
                            animation: state !== "idle" ? "agentPulse 1.5s infinite" : "none",
                          }} />
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{state}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                    {[
                      { label: "Processed", value: metrics.processed },
                      { label: "Accuracy", value: metrics.accuracy },
                      { label: "Avg Time", value: metrics.avgTime },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ textAlign: "center", padding: "8px 4px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                        <div style={{ color: agent.color, fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron', monospace" }}>{value}</div>
                        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 9, letterSpacing: "0.08em", marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Last action */}
                  <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, borderLeft: `2px solid ${agent.color}40` }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Last action</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>
                      {feedItems.find(f => f.agent === key)?.action || "Idle — waiting for input"}
                    </div>
                  </div>

                  {key === "mayor" && (
                    <button onClick={() => setShowMayorChat(true)} style={{
                      width: "100%", marginTop: 12, padding: "9px",
                      background: `${T.gold}15`, border: `1px solid ${T.gold}30`,
                      borderRadius: 7, color: T.gold, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>Open Mayor Chat</button>
                  )}
                  {key === "budget" && (
                    <button onClick={() => setShowBudget(true)} style={{
                      width: "100%", marginTop: 12, padding: "9px",
                      background: `${T.agents.budget.color}15`, border: `1px solid ${T.agents.budget.color}30`,
                      borderRadius: 7, color: T.agents.budget.color, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>Open Budget Simulator</button>
                  )}
                  {key === "severity" && (
                    <button onClick={() => setShowDebate(true)} style={{
                      width: "100%", marginTop: 12, padding: "9px",
                      background: `${T.purple}15`, border: `1px solid ${T.purple}30`,
                      borderRadius: 7, color: T.purple, fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    }}>Start Debate Mode</button>
                  )}
                </Glass>
              );
            })}
          </div>
        </div>
      )}

      {/* ISSUE INTAKE */}
      {activeTab === "intake" && (
        <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: T.cyan, letterSpacing: "0.15em", marginBottom: 8 }}>
              ISSUE INTAKE PORTAL
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "white" }}>Report a City Infrastructure Issue</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 6 }}>
              Vision Agent will analyze your submission in real time
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Drop zone */}
            <Glass style={{ padding: 24 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 16, fontFamily: "'Orbitron', monospace" }}>
                👁 VISION AGENT — IMAGE ANALYSIS
              </div>
              <label onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}
                style={{
                  display: "block", border: `2px dashed ${T.cyan}30`, borderRadius: 12,
                  padding: 40, textAlign: "center", cursor: "pointer",
                  background: `${T.cyan}04`, transition: "all 0.3s ease",
                  minHeight: 200, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 12,
                }}>
                <input type="file" accept="image/*" onChange={handleFileDrop} style={{ display: "none" }} />
                {!intakeFile && !scanning && !scanResult && (
                  <>
                    <div style={{ fontSize: 40 }}>📷</div>
                    <div style={{ color: T.cyan, fontSize: 14, fontWeight: 600 }}>Drop image here</div>
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>or click to upload</div>
                    <Pill color={T.cyan} style={{ marginTop: 4 }}>Supports JPG, PNG, HEIC</Pill>
                  </>
                )}
                {scanning && (
  <div style={{ width: "100%" }}>
    {intakeFile && (
      <div style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16,
        height: 180
      }}>
        <img
          src={URL.createObjectURL(intakeFile)}
          alt="Scanning"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.45
          }}
        />

        <div style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
          boxShadow: `0 0 10px ${T.cyan}`,
          animation: "scanLine 2s linear infinite"
        }} />
      </div>
    )}

    <div style={{
      width: 40,
      height: 40,
      margin: "0 auto 12px",
      border: `3px solid ${T.cyan}`,
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite"
    }} />

    <div style={{ color: T.cyan, fontSize: 14, fontWeight: 600 }}>
      Vision Agent analyzing...
      <div
  style={{
    width: "100%",
    height: 8,
    background: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 8,
  }}
>
  <div
    style={{
      width: `${progress}%`,
      height: "100%",
      background: T.cyan,
      transition: "width 0.4s ease",
      boxShadow: `0 0 12px ${T.cyan}`,
    }}
  />
</div>

<div
  style={{
    color: T.cyan,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
  }}
>
  SCAN PROGRESS: {progress}%
</div>
    </div>

    <div style={{
      color: "rgba(255,255,255,0.3)",
      fontSize: 12,
      marginTop: 6
    }}>
      Detecting issues, measuring severity...
    </div>
  </div>
)}
                {scanResult && !scanning && (
                  <div style={{ width: "100%", textAlign: "left" }}>

                    {intakeFile && (
  <div style={{
    width: "100%",
    height: 160,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 14,
    border: `1px solid ${T.cyan}30`
  }}>
    <img
      src={URL.createObjectURL(intakeFile)}
      alt="Issue"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }}
    />
  </div>
)}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.low, boxShadow: `0 0 8px ${T.low}` }} />
                      <span style={{ color: T.low, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>ANALYSIS COMPLETE</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: T.cyan, marginBottom: 4 }}>
                      {IssueTypeIcon(scanResult.type)} {scanResult.type.replace("_", " ").toUpperCase()}
                    </div>
                    <Pill color={T.cyan} style={{ marginBottom: 12 }}>Confidence: {scanResult.confidence}%</Pill>
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 1.5, margin: "0 0 12px" }}>
                      {scanResult.description}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Risk Score", value: scanResult.riskScore + "/100", color: SeverityColor(scanResult.riskScore) },
                        { label: "Accident Probability", value: scanResult.accidentProb, color: T.high },
                        { label: "Estimated Cost", value: scanResult.estimatedCost, color: T.agents.budget.color },
                        { label: "Status", value: "Queued ✓", color: T.low },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                          <div style={{ color, fontSize: 13, fontWeight: 700 }}>{value}</div>
                          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.08em" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { setIntakeFile(null); setScanResult(null); }} style={{
                      width: "100%", marginTop: 12, padding: "8px",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 7, color: "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer",
                    }}>Submit Another</button>
                  </div>
                )}
              </label>
            </Glass>

            {/* Text/Voice report */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Glass style={{ padding: 20 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 14, fontFamily: "'Orbitron', monospace" }}>
                  ✏️ TEXT REPORT
                </div>
                <textarea placeholder="Describe the issue in your own words..."
                  style={{
                    width: "100%", minHeight: 100, background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${T.glassBorder}`, borderRadius: 8,
                    padding: "12px 14px", color: "white", fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical",
                  }}
                />
                <input placeholder="Location (address or landmark)"
                  style={{
                    width: "100%", marginTop: 10, background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${T.glassBorder}`, borderRadius: 8,
                    padding: "10px 14px", color: "white", fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif", outline: "none",
                  }}
                />
                <button style={{
                  width: "100%", marginTop: 12, padding: "11px",
                  background: `linear-gradient(135deg, ${T.cyan}30, ${T.blue}20)`,
                  border: `1px solid ${T.cyan}40`, borderRadius: 8,
                  color: T.cyan, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>Submit Report →</button>
              </Glass>

              <Glass style={{ padding: 20 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", marginBottom: 14, fontFamily: "'Orbitron', monospace" }}>
                  📊 AGENT PIPELINE PREVIEW
                </div>

                {steps.map((step) => {
  const agent = T.agents[step.key];

  return (
    <div
      key={step.key}
      style={{
        display: "flex",
        gap: 10,
        marginBottom: 12,
        opacity: step.status === "waiting" ? 0.35 : 1,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background:
            step.status === "done"
              ? agent.color
              : "transparent",
          border: `2px solid ${agent.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 10,
        }}
      >
        {step.status === "done" ? "✓" : agent.icon}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            color: agent.color,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {agent.name}
        </div>

        <div
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 10,
          }}
        >
          {step.label}
        </div>

{step.status === "active" && (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
      marginTop: 4,
    }}
  >
    <span
      style={{
        color: T.cyan,
        fontSize: 10,
      }}
    >
      Processing
    </span>

    {[0, 0.2, 0.4].map((d, i) => (
      <div
        key={i}
        style={{
          width: 4,
          height: 4,
          borderRadius: "50%",
          background: T.cyan,
          animation: `dotBounce 1s ease ${d}s infinite`,
        }}
      />
    ))}
  </div>
)}
      </div>
    </div>
  );
})}
              </Glass>
            </div>
          </div>
        </div>
      )}

{showReport && (
  <div style={{
    position: "fixed", inset: 0,
    background: "rgba(2,4,8,0.96)",
    backdropFilter: "blur(20px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    padding: "24px 16px",
  }}>
    <div style={{
      width: "100%", maxWidth: 860,
      background: T.glass,
      border: `1px solid ${T.glassBorder}`,
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16,
      display: "flex", flexDirection: "column",
      maxHeight: "98vh",
      overflow: "hidden",
      boxShadow: T.cyanGlow,
    }}>

      {/* Modal header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 24px",
        borderBottom: `1px solid ${T.glassBorder}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: `linear-gradient(135deg, ${T.blue}40, ${T.blue}15)`,
            border: `1.5px solid ${T.blue}50`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, boxShadow: `0 0 14px ${T.blue}30`,
          }}>📄</div>
          <div>
            <div style={{
              color: T.cyan, fontWeight: 900, fontSize: 14,
              letterSpacing: "0.1em", fontFamily: "'Orbitron', monospace",
            }}>
              CIVICMIND EXECUTIVE REPORT
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
              Infrastructure briefing · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <button onClick={exportReportPDF} style={{
            background: `${T.blue}15`,
            border: `1px solid ${T.blue}40`,
            borderRadius: 8, padding: "8px 16px",
            color: T.blue, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            📄 Export PDF
          </button>
          <button onClick={() => setShowReport(false)} style={{
            background: "rgba(255,59,59,0.1)",
            border: `1px solid ${T.critical}30`,
            borderRadius: 8, padding: "8px 14px",
            color: T.critical, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.2s",
          }}>✕ CLOSE</button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20,
        padding: "10px 24px",
        borderBottom: `1px solid rgba(0,212,255,0.06)`,
        background: "rgba(0,212,255,0.03)",
        flexShrink: 0,
      }}>
        {[
          { label: "City Health", value: `${healthScore}/100`, color: healthScore > 70 ? T.low : T.medium },
          { label: "Active Issues", value: issues.length, color: T.cyan },
          { label: "Agents Online", value: "7 / 7", color: T.low },
          { label: "Risk Status", value: healthScore > 80 ? "LOW" : healthScore > 60 ? "MODERATE" : "HIGH", color: healthScore > 80 ? T.low : healthScore > 60 ? T.medium : T.critical },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", align: "center", gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, letterSpacing: "0.08em" }}>{label}:</span>
            <span style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{value}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.low, boxShadow: `0 0 6px ${T.low}`, animation: "agentPulse 2s infinite" }} />
          <span style={{ color: T.low, fontSize: 9, fontWeight: 700, letterSpacing: "0.1em" }}>LIVE DATA</span>
        </div>
      </div>

      {/* Report body */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "24px 28px",
      }}>
        <pre style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "rgba(255,255,255,0.82)",
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontSize: 12.5,
          lineHeight: 1.75,
          letterSpacing: "0.01em",
          margin: 0,
        }}>
          {reportText}
        </pre>
      </div>

      {/* Modal footer */}
      <div style={{
        padding: "12px 24px",
        borderTop: `1px solid ${T.glassBorder}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexShrink: 0,
        background: "rgba(0,212,255,0.02)",
      }}>
        <span style={{
          fontFamily: "'Orbitron', monospace", fontSize: 9,
          color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em",
        }}>
          CIVICMIND AI 
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>
          AI-POWERED INFRASTRUCTURE INTELLIGENCE REPORT
        </span>
      </div>
    </div>
  </div>
)}

      {/* FOOTER */}
      <div style={{
        marginTop: 40, padding: "16px 24px",
        borderTop: `1px solid ${T.glassBorder}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "rgba(255,255,255,0.2)", fontSize: 11,
      }}>
        <span style={{ fontFamily: "'Orbitron', monospace", letterSpacing: "0.1em" }}>
          CIVICMIND AI 
        </span>
        <span>7 agents active · {feedItems.length} events logged · City Health: {healthScore}/100</span>
      </div>
    </div>
  );
}





