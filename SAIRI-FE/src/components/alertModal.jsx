import React, { useState, useEffect, useRef } from "react";

/**
 * SafetyAlertModal
 * A modern confirm/cancel dialog — soft-white card, floating icon badge,
 * subtle depth, and an animated safety helmet as the signature detail.
 * Brand colors: #222e69 (ink navy) and #008042 (safety green).
 *
 * Pass `variant="danger"` for destructive actions (red confirm button,
 * red badge glow/lamp) — defaults to `variant="success"` (green).
 *
 * No required props — renders a working demo with internal state,
 * but also accepts optional props to drive it from outside as a
 * controlled dialog (pass `open`).
 */
export default function SafetyAlertModal({
    open: openProp,
    title = "Delete this group?",
    message = "This will permanently remove the group and everything inside it. This can't be undone.",
    confirmLabel = "Yes, delete",
    cancelLabel = "Cancel",
    variant = "success", // "success" (green) | "danger" (red)
    onConfirm,
    onCancel,
}) {
    const [internalOpen, setInternalOpen] = useState(true);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : internalOpen;
    const cardRef = useRef(null);

    const close = () => !isControlled && setInternalOpen(false);

    const handleCancel = () => {
        onCancel && onCancel();
        close();
    };

    const handleConfirm = () => {
        onConfirm && onConfirm();
        close();
    };

    // Escape to close, and a light focus touch for accessibility
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") handleCancel();
        };
        document.addEventListener("keydown", onKey);
        cardRef.current?.focus();
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    return (
        <div style={styles.stage}>
            <style>{css}</style>

            {!open && (
                <button style={styles.reopenBtn} onClick={() => setInternalOpen(true)}>
                    Reopen dialog
                </button>
            )}

            {open && (
                <div className="sam-overlay" role="presentation" onClick={handleCancel}>
                    <div
                        ref={cardRef}
                        className="sam-card"
                        data-variant={variant}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="sam-title"
                        aria-describedby="sam-desc"
                        tabIndex={-1}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="sam-close" onClick={handleCancel} aria-label="Close">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        </button>

                        {/* <div className="sam-badge" aria-hidden="true">
                            <div className="sam-badge-ring" />
                            <svg
                                className="sam-icon"
                                viewBox="0 0 140 120"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    className="sam-dome"
                                    d="M20 84 C20 40 42 16 70 16 C98 16 120 40 120 84 Z"
                                    fill="#00A057"
                                    stroke="#111a3d"
                                    strokeWidth="6"
                                    strokeLinejoin="round"
                                />
                                <path d="M70 16 L70 84" stroke="#111a3d" strokeWidth="5" strokeLinecap="round" />
                                <path
                                    d="M12 80 C12 96 36 104 70 104 C104 104 128 96 128 80
                     C128 92 104 98 70 98 C36 98 12 92 12 80 Z"
                                    fill="#111a3d"
                                    stroke="#111a3d"
                                    strokeWidth="6"
                                    strokeLinejoin="round"
                                />
                                <circle cx="70" cy="54" r="14" fill="#1b2454" stroke="#111a3d" strokeWidth="5" className="sam-lamp-ring" />
                                <circle cx="70" cy="54" r="8" fill="#FFD54A" className="sam-lamp" />
                                <path
                                    d="M34 60 C34 42 46 28 60 24"
                                    stroke="#ffffff"
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    opacity="0.55"
                                    fill="none"
                                />
                            </svg>
                        </div> */}

                        <h2 id="sam-title" className="sam-title">{title}</h2>
                        <p id="sam-desc" className="sam-message">{message}</p>

                        <div className="sam-actions">
                            <button className="sam-btn sam-btn-cancel" onClick={handleCancel}>
                                {cancelLabel}
                            </button>
                            <button className={`sam-btn sam-btn-confirm sam-btn-confirm--${variant}`} onClick={handleConfirm}>
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    stage: {
        minHeight: "480px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#EEF1F6",
        fontFamily:
            "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        padding: "24px",
        boxSizing: "border-box",
    },
    reopenBtn: {
        background: "#008042",
        color: "#fff",
        border: "none",
        borderRadius: "10px",
        padding: "12px 22px",
        fontSize: "14.5px",
        fontWeight: 600,
        cursor: "pointer",
        boxShadow: "0 6px 18px rgba(0,128,66,0.28)",
    },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

.sam-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 26, 61, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: sam-fade-in 0.16s ease-out;
  padding: 20px;
}

@keyframes sam-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sam-card {
  position: relative;
  width: 380px;
  max-width: 100%;
  background: #ffffff;
  border-radius: 20px;
  box-shadow:
    0 1px 2px rgba(17, 26, 61, 0.04),
    0 24px 48px -12px rgba(17, 26, 61, 0.28);
  padding: 40px 32px 28px;
  text-align: center;
  outline: none;
  animation: sam-pop-in 0.22s cubic-bezier(.16,1,.3,1);
}

@keyframes sam-pop-in {
  from { opacity: 0; transform: translateY(10px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.sam-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: #9AA3B8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}

.sam-close:hover {
  background: #F1F3F8;
  color: #222e69;
}

.sam-badge {
  position: relative;
  width: 84px;
  height: 84px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sam-badge-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 35%, rgba(0,128,66,0.14) 0%, rgba(0,128,66,0.05) 55%, transparent 75%);
}

.sam-icon {
  position: relative;
  width: 62px;
  height: 53px;
  animation: sam-bob 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 6px rgba(17,26,61,0.18));
}

.sam-lamp-ring {
  animation: sam-ring-pulse 1.8s ease-in-out infinite;
  transform-origin: 70px 54px;
}

.sam-lamp {
  animation: sam-lamp-pulse 1.8s ease-in-out infinite;
  transform-origin: 70px 54px;
}

@keyframes sam-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-3px) rotate(-1deg); }
}

@keyframes sam-lamp-pulse {
  0%, 100% { fill: #FFD54A; opacity: 1; }
  50%      { fill: #FFF4C2; opacity: 0.85; }
}

@keyframes sam-ring-pulse {
  0%, 100% { stroke-opacity: 1; }
  50%      { stroke-opacity: 0.45; }
}

.sam-title {
  color: #171F3D;
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.sam-message {
  color: #667085;
  font-size: 14px;
  line-height: 1.55;
  margin: 0 0 26px;
}

.sam-actions {
  display: flex;
  gap: 10px;
}

.sam-btn {
  flex: 1;
  padding: 11px 0;
  border-radius: 11px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: transform 0.1s ease, box-shadow 0.14s ease, background 0.14s ease, border-color 0.14s ease;
}

.sam-btn:active {
  transform: scale(0.98);
}

.sam-btn-cancel {
  background: #ffffff;
  color: #344054;
  border-color: #E4E7EC;
}

.sam-btn-cancel:hover {
  background: #f9fbfa;
  border-color: #549664;
}

.sam-btn-confirm {
  color: #ffffff;
}

.sam-btn-confirm--success {
  background: #008042;
  box-shadow: 0 1px 2px rgba(0,128,66,0.1), 0 4px 10px rgba(0,128,66,0.22);
}

.sam-btn-confirm--success:hover {
  background: #00723a;
  box-shadow: 0 1px 2px rgba(0,128,66,0.12), 0 6px 14px rgba(0,128,66,0.3);
}

.sam-btn-confirm--danger {
  background: #c77069;
  box-shadow: 0 1px 2px rgba(217,45,32,0.1), 0 4px 10px rgba(217,45,32,0.22);
}

.sam-btn-confirm--danger:hover {
  background: #B42318;
  box-shadow: 0 1px 2px rgba(217,45,32,0.12), 0 6px 14px rgba(217,45,32,0.3);
}

/* danger variant: shift the badge glow and helmet lamp to match */
.sam-card[data-variant="danger"] .sam-badge-ring {
  background: radial-gradient(circle at 50% 35%, rgba(217,45,32,0.14) 0%, rgba(217,45,32,0.05) 55%, transparent 75%);
}

.sam-card[data-variant="danger"] .sam-lamp {
  animation-name: sam-lamp-pulse-danger;
}

.sam-card[data-variant="danger"] .sam-lamp-ring {
  stroke: #D92D20;
}

@keyframes sam-lamp-pulse-danger {
  0%, 100% { fill: #FF6B5C; opacity: 1; }
  50%      { fill: #FFC2BA; opacity: 0.85; }
}

.sam-btn-confirm:focus-visible,
.sam-btn-cancel:focus-visible,
.sam-close:focus-visible {
  outline: 2px solid #222e69;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .sam-icon, .sam-lamp, .sam-lamp-ring, .sam-card, .sam-overlay {
    animation: none !important;
  }
}
`;