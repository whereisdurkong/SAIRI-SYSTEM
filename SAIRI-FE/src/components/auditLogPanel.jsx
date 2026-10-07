import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import config from "config";

/* ════════════════════════════════════════════════════════════════════════
   AUDIT LOG PANEL — slide-in from the right, ~30% width
   Usage:
     const [logsOpen, setLogsOpen] = useState(false);
     <button onClick={() => setLogsOpen(true)}>View Audit Log</button>
     <AuditLogPanel accidentId={accident_id} open={logsOpen} onClose={() => setLogsOpen(false)} />
   ════════════════════════════════════════════════════════════════════════ */

const SECTION_LABELS = {
    section_one: "Section 1 and 2",
    section_three: "Section 3",
    section_four_six: "Section 4, 5 and 6",
    section_seven: "Section 7",
    section_eight: "Section 8",
};

function sectionLabel(section) {
    if (!section) return "General";
    return SECTION_LABELS[section] || section.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatTimestamp(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString(undefined, {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function relativeTime(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatTimestamp(ts);
}

// changes_made comes back as a Postgres-array-literal string, e.g.
// '{"user updated Field from A to B","user updated Field2 from C to D"}'
// Parses it into a clean array of individual change strings.
// function parseChangesArray(raw) {
//     if (!raw) return [];
//     if (Array.isArray(raw)) return raw;

//     let str = String(raw).trim();
//     // Strip outer { }
//     if (str.startsWith("{") && str.endsWith("}")) {
//         str = str.slice(1, -1);
//     }
//     if (!str) return [];

//     // Split on `","` boundaries while respecting escaped quotes
//     const parts = [];
//     let current = "";
//     let inQuotes = false;
//     for (let i = 0; i < str.length; i++) {
//         const ch = str[i];
//         const prev = str[i - 1];
//         if (ch === '"' && prev !== "\\") {
//             inQuotes = !inQuotes;
//             continue;
//         }
//         if (ch === "," && !inQuotes) {
//             parts.push(current);
//             current = "";
//             continue;
//         }
//         current += ch;
//     }
//     if (current) parts.push(current);

//     return parts
//         .map(p => p.replace(/\\"/g, '"').trim())
//         .filter(Boolean);
// }
function parseChangesArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;

    let str = String(raw).trim();
    if (str.startsWith("{") && str.endsWith("}")) {
        str = str.slice(1, -1);
    }
    if (!str) return [];

    const parts = [];
    let current = "";
    let inQuotes = false;
    let braceDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        const prev = str[i - 1];

        if (ch === '"' && prev !== "\\") {
            inQuotes = !inQuotes;
            continue;
        }
        if (!inQuotes) {
            if (ch === "{" || ch === "[") { braceDepth++; }
            if (ch === "}" || ch === "]") { braceDepth = Math.max(0, braceDepth - 1); }
        }
        if (ch === "," && !inQuotes && braceDepth === 0) {
            parts.push(current);
            current = "";
            continue;
        }
        current += ch;
    }
    if (current) parts.push(current);

    return parts
        .map(p => p.replace(/\\"/g, '"').trim())
        .filter(Boolean);
}
function splitCombinedChanges(raw, actor) {
    if (!raw) return [];
    const text = String(raw).trim();
    if (!actor) return [text];

    const escActor = actor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\s+(?=${escActor}\\s+(?:created|updated)\\b)`, "g");
    const parts = text.split(re).map(s => s.trim()).filter(Boolean);

    return parts.length ? parts : [text];
}
// Strips a leading "username " prefix from a single change string, since the
// actor is already shown separately (from created_by).
function stripActorPrefix(text, actor) {
    if (!text) return "";
    if (actor && text.startsWith(actor)) {
        return text.slice(actor.length).trim();
    }
    // Fallback: strip the first "word" if it looks like a username (no spaces before first verb)
    const match = text.match(/^(\S+)\s+(.*)$/);
    return match ? match[2] : text;
}

// Some change values are raw JSON (e.g. participants: [{"name":"1","department":"1"}]).
// Strip the array brackets and quotes so it reads as plain "{name:1, department:1}"
// instead of noisy JSON syntax. Curly braces are kept as a light visual grouping.
function sanitizeDisplayText(text) {
    if (!text) return "";
    return text
        .replace(/[[\]]/g, "")   // drop [ ]
        .replace(/"/g, "")        // drop "
        .replace(/,(\S)/g, ", $1") // add a space after commas for readability
        .trim();
}

// Renders a sanitized change string as JSX, bolding the "from" / "to" keywords
// so the before/after values are easy to scan.
function renderChangeText(text) {
    if (!text) return null;
    const parts = text.split(/\b(from|to)\b/i);
    return parts.map((part, i) =>
        /^(from|to)$/i.test(part)
            ? <strong key={i} className="alp-kw">{part}</strong>
            : <span key={i}>{part}</span>
    );
}

function initials(name) {
    if (!name) return "?";
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

function groupByDay(logs) {
    const groups = [];
    let lastKey = null;
    logs.forEach(log => {
        const d = new Date(log.created_at);
        const key = isNaN(d.getTime()) ? "Unknown" : d.toDateString();
        if (key !== lastKey) {
            groups.push({ key, label: isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }), items: [] });
            lastKey = key;
        }
        groups[groups.length - 1].items.push(log);
    });
    return groups;
}

export default function AuditLogPanel({ accidentId, open, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sectionFilter, setSectionFilter] = useState("ALL");

    const fetchLogs = useCallback(async () => {
        if (!accidentId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${config.baseApi}/logs/get-logs-by-id`, {
                params: { accident_id: accidentId },
            });
            const data = Array.isArray(res.data) ? res.data : [];
            const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLogs(sorted);
        } catch (err) {
            console.log("UNABLE TO FETCH LOGS:", err);
            setError("Unable to load audit log. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [accidentId]);

    useEffect(() => {
        if (open) fetchLogs();
    }, [open, fetchLogs]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const sections = ["ALL", ...Array.from(new Set(logs.map(l => l.section).filter(Boolean)))];
    const filteredLogs = sectionFilter === "ALL" ? logs : logs.filter(l => l.section === sectionFilter);
    const grouped = groupByDay(filteredLogs);

    return (
        <>
            <style>{AUDIT_STYLE_SHEET}</style>

            {/* Backdrop */}
            <div
                className={`alp-backdrop${open ? " alp-backdrop--visible" : ""}`}
                onClick={onClose}
                aria-hidden={!open}
            />

            {/* Panel */}
            <aside className={`alp-panel${open ? " alp-panel--open" : ""}`} role="dialog" aria-label="Audit Log">
                <div className="alp-head">
                    <div className="alp-head-titles">
                        <span className="alp-head-eyebrow">Audit Trail</span>
                        <span className="alp-head-title">Change Log</span>
                    </div>
                    <button className="alp-close" onClick={onClose} aria-label="Close audit log">✕</button>
                </div>

                {sections.length > 2 && (
                    <div className="alp-filters">
                        {sections.map(s => (
                            <button
                                key={s}
                                className={`alp-filter-chip${sectionFilter === s ? " alp-filter-chip--active" : ""}`}
                                onClick={() => setSectionFilter(s)}
                            >
                                {s === "ALL" ? "All Sections" : sectionLabel(s)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="alp-body">
                    {loading && (
                        <div className="alp-state">
                            <div className="alp-spinner" />
                            <span>Loading history…</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="alp-state alp-state--error">
                            <span>{error}</span>
                            <button className="alp-retry" onClick={fetchLogs}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && filteredLogs.length === 0 && (
                        <div className="alp-state">
                            <span>No changes recorded yet.</span>
                        </div>
                    )}

                    {!loading && !error && grouped.map(group => (
                        <div className="alp-day-group" key={group.key}>
                            <div className="alp-day-label">{group.label}</div>
                            <div className="alp-timeline">
                                {group.items.map((log) => {
                                    const changes = parseChangesArray(log.changes_made)
                                        .flatMap(c => splitCombinedChanges(c, log.created_by));
                                    return (
                                        <div className="alp-entry" key={log.id_master}>
                                            <div className="alp-entry-rail">
                                                <div className="alp-avatar">{initials(log.created_by)}</div>
                                                <div className="alp-rail-line" />
                                            </div>
                                            <div className="alp-entry-body">
                                                <div className="alp-entry-top">
                                                    <span className="alp-entry-actor">{log.created_by}</span>
                                                    {log.section && (
                                                        <span className="alp-entry-section">{sectionLabel(log.section)}</span>
                                                    )}
                                                </div>
                                                {changes.length > 1 ? (
                                                    <ul className="alp-entry-list">
                                                        {changes.map((c, i) => (
                                                            <li key={i}>{renderChangeText(sanitizeDisplayText(stripActorPrefix(c, log.created_by)))}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="alp-entry-text">
                                                        {renderChangeText(sanitizeDisplayText(stripActorPrefix(changes[0] || "", log.created_by)))}
                                                    </p>
                                                )}
                                                <span className="alp-entry-time" title={formatTimestamp(log.created_at)}>
                                                    {relativeTime(log.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="alp-footer">
                    <span className="alp-footer-count">
                        {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
                    </span>
                    <button className="alp-refresh" onClick={fetchLogs} disabled={loading}>
                        ↻ Refresh
                    </button>
                </div>
            </aside>
        </>
    );
}

/* ════════════════════════════════════════════════════════════════════════
   STYLESHEET — matches SAIRI navy/mint theme
   ════════════════════════════════════════════════════════════════════════ */

const AUDIT_STYLE_SHEET = `
.alp-backdrop {
  position: fixed; inset: 0;
  background: rgba(13,27,42,0.35);
  backdrop-filter: blur(1px);
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
  z-index: 998;
}
.alp-backdrop--visible { opacity: 1; pointer-events: auto; }

.alp-panel {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 30%; min-width: 360px; max-width: 480px;
  background: #F0F4F2;
  border-left: 1px solid #C8D8D1;
  box-shadow: -8px 0 24px rgba(13,27,42,0.15);
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 999;
  font-family: 'Inter', sans-serif;
  color: #0D1B2A;
}
.alp-panel--open { transform: translateX(0); }

@media (max-width: 768px) {
  .alp-panel { width: 100%; min-width: 0; max-width: none; }
}

.alp-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  background: #0D1B2A;
  border-bottom: 3px solid #1B8C60;
  flex-shrink: 0;
}
.alp-head-titles { display: flex; flex-direction: column; }
.alp-head-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
  color: #1B8C60;
}
.alp-head-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700; font-size: 21px; color: #E8F4EF;
  letter-spacing: 0.01em;
}
.alp-close {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #8AA4B8;
  width: 30px; height: 30px; border-radius: 6px;
  cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.alp-close:hover { color: #fff; border-color: rgba(255,255,255,0.3); background: rgba(255,255,255,0.1); }

.alp-filters {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 12px 22px;
  background: #fff;
  border-bottom: 1px solid #C8D8D1;
  flex-shrink: 0;
}
.alp-filter-chip {
  font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 600;
  padding: 5px 12px; border-radius: 20px;
  border: 1.5px solid #C8D8D1; background: #F0F4F2;
  color: #5E7A6E; cursor: pointer; transition: all 0.15s;
}
.alp-filter-chip:hover { border-color: #9DBCB0; }
.alp-filter-chip--active {
  background: #1B5E44; border-color: #0F3D2B; color: #fff;
}

.alp-body {
  flex: 1; overflow-y: auto; padding: 18px 22px 30px;
}

.alp-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px 20px; text-align: center;
  color: #5E7A6E; font-size: 13px;
}
.alp-state--error { color: #B02020; }
.alp-retry {
  font-size: 11px; font-weight: 600; color: #1B5E44;
  background: #D4EDE5; border: 1px solid #1B5E44;
  padding: 5px 14px; border-radius: 5px; cursor: pointer;
}
.alp-spinner {
  width: 22px; height: 22px; border-radius: 50%;
  border: 3px solid #C8D8D1; border-top-color: #1B8C60;
  animation: alp-spin 0.8s linear infinite;
}
@keyframes alp-spin { to { transform: rotate(360deg); } }

.alp-day-group { margin-bottom: 22px; }
.alp-day-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: #1B5E44;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px dashed #9DBCB0;
}

.alp-timeline { display: flex; flex-direction: column; }

.alp-entry { display: flex; gap: 12px; }
.alp-entry-rail {
  display: flex; flex-direction: column; align-items: center;
  flex-shrink: 0;
}
.alp-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #1B5E44; color: #fff;
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.alp-rail-line {
  flex: 1; width: 2px; background: #C8D8D1; margin: 4px 0;
  min-height: 12px;
}
.alp-entry:last-child .alp-rail-line { display: none; }

.alp-entry-body {
  flex: 1; min-width: 0;
  padding-bottom: 18px;
}
.alp-entry-top {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 3px;
}
.alp-entry-actor {
  font-size: 12.5px; font-weight: 700; color: #0D1B2A;
}
.alp-entry-section {
  font-family: 'IBM Plex Mono', monospace; font-size: 9.5px;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: #1B8C60; background: #D4EDE5;
  padding: 2px 8px; border-radius: 10px;
}
.alp-entry-text {
  font-size: 12.5px; line-height: 1.5; color: #2C4A3E;
  margin: 0 0 4px; word-break: break-word;
}
.alp-entry-list {
  margin: 0 0 4px; padding-left: 16px;
  display: flex; flex-direction: column; gap: 3px;
}
.alp-entry-list li {
  font-size: 12.5px; line-height: 1.5; color: #2C4A3E;
  word-break: break-word;
}
.alp-entry-list li::marker { color: #1B8C60; }
.alp-kw {
  font-weight: 700; color: #0D1B2A;
}
.alp-entry-time {
  font-size: 10.5px; color: #5E7A6E; font-family: 'IBM Plex Mono', monospace;
}

.alp-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 22px; background: #fff;
  border-top: 1px solid #C8D8D1; flex-shrink: 0;
}
.alp-footer-count {
  font-size: 11px; color: #5E7A6E; font-family: 'IBM Plex Mono', monospace;
}
.alp-refresh {
  font-size: 11px; font-weight: 600; color: #1B5E44;
  background: transparent; border: 1px solid #1B5E44;
  padding: 5px 12px; border-radius: 5px; cursor: pointer;
  transition: all 0.15s;
}
.alp-refresh:hover { background: #D4EDE5; }
.alp-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
`;