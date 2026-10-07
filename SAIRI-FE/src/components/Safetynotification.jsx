import React, { useState, useCallback, useRef, createContext, useContext } from "react";

/**
 * Safety Accident Monitoring — Notification System
 *
 * Palette:
 *  #222e69  — Navy   (structure / info accent / text)
 *  #008042  — Green  (success)
 *  #ffffff  — White  (surface / text-on-dark)
 *  #c22b2b  — Red    (error — added so error/success are visually distinct;
 *                      a safety system should never rely on color alone
 *                      for critical vs. safe, so icon + label reinforce it)
 *
 * Usage:
 *   const notify = useNotification();
 *   notify.success('Sensor Restored', 'Zone 3 gas sensor is back online.');
 *   notify.error('Accident Detected', 'Impact detected in Zone 3 at 14:02.');
 */

// ---------- Context / Provider ----------

const NotificationContext = createContext(null);

let idCounter = 0;

export function NotificationProvider({ children, position = "top-right" }) {
    const [notifications, setNotifications] = useState([]);
    const timers = useRef({});

    const remove = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        if (timers.current[id]) {
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }
    }, []);

    const push = useCallback(
        (type, title, description, duration = 6000) => {
            const id = ++idCounter;
            setNotifications((prev) => [...prev, { id, type, title, description }]);
            if (duration > 0) {
                timers.current[id] = setTimeout(() => remove(id), duration);
            }
            return id;
        },
        [remove]
    );

    const api = {
        notify: (type, title, description, duration) =>
            push(type, title, description, duration),
        success: (title, description, duration) =>
            push("success", title, description, duration),
        error: (title, description, duration) =>
            push("error", title, description, duration ?? 10000),
        dismiss: remove,
    };

    return (
        <NotificationContext.Provider value={api}>
            {children}
            <NotificationViewport
                notifications={notifications}
                onDismiss={remove}
                position={position}
            />
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error("useNotification must be used inside a NotificationProvider");
    }
    return ctx;
}

// ---------- Viewport ----------

const positionStyles = {
    "top-right": { top: 20, right: 20 },
    "top-left": { top: 20, left: 20 },
    "bottom-right": { bottom: 20, right: 20 },
    "bottom-left": { bottom: 20, left: 20 },
};

function NotificationViewport({ notifications, onDismiss, position }) {
    return (
        <div
            style={{
                position: "fixed",
                zIndex: 9999,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: 380,
                maxWidth: "calc(100vw - 32px)",
                ...positionStyles[position],
            }}
        >
            {notifications.map((n) => (
                <NotificationCard key={n.id} {...n} onDismiss={() => onDismiss(n.id)} />
            ))}
        </div>
    );
}

// ---------- Card ----------

const THEME = {
    success: {
        accent: "#008042",
        bg: "#ffffff",
        iconBg: "#008042",
        label: "RESOLVED",
        icon: (
            <path
                d="M5 13l4 4L19 7"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        ),
    },
    error: {
        accent: "#c22b2b",
        bg: "#ffffff",
        iconBg: "#c22b2b",
        label: "ALERT",
        icon: (
            <path
                d="M12 8v5M12 16.5h.01M10.3 3.9L2.6 17.5a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        ),
    },
};

function NotificationCard({ type, title, description, onDismiss }) {
    const theme = THEME[type] || THEME.success;

    return (
        <div
            role="alert"
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: theme.bg,
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(34,46,105,0.18)",
                borderLeft: `5px solid ${theme.accent}`,
                padding: "14px 14px 14px 12px",
                fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                animation: "sam-slide-in 0.25s ease-out",
            }}
        >
            {/* Icon */}
            <div
                style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: theme.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <svg width="16" height="16" viewBox="0 0 24 24">
                    {theme.icon}
                </svg>
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: theme.accent,
                        marginBottom: 2,
                    }}
                >
                    {theme.label}
                </div>
                <div
                    style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: "#222e69",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                    }}
                >
                    {title}
                </div>
                {description ? (
                    <div
                        style={{
                            fontSize: 13,
                            color: "#4b5370",
                            marginTop: 3,
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                        }}
                    >
                        {description}
                    </div>
                ) : null}
            </div>

            {/* Close */}
            <button
                onClick={onDismiss}
                aria-label="Dismiss notification"
                style={{
                    flexShrink: 0,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#8b91ab",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: 4,
                }}
            >
                ×
            </button>

            <style>{`
        @keyframes sam-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}

// ---------- Demo ----------

export default function Demo() {
    return (
        <NotificationProvider position="top-right">
            <DemoButtons />
        </NotificationProvider>
    );
}

function DemoButtons() {
    const notify = useNotification();

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f4f5fa",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                fontFamily: "'Inter', sans-serif",
            }}
        >
            <h2 style={{ color: "#222e69", marginBottom: 8 }}>
                Safety Accident Monitoring — Notification Demo
            </h2>
            <div style={{ display: "flex", gap: 12 }}>
                <button
                    onClick={() =>
                        notify.error(
                            "Accident Detected",
                            "Impact sensor triggered in Zone 3 at 14:02. Dispatching response team."
                        )
                    }
                    style={{
                        background: "#c22b2b",
                        color: "#fff",
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Trigger Error
                </button>
                <button
                    onClick={() =>
                        notify.success(
                            "Zone Cleared",
                            "Zone 3 has been inspected and marked safe."
                        )
                    }
                    style={{
                        background: "#008042",
                        color: "#fff",
                        border: "none",
                        padding: "10px 18px",
                        borderRadius: 8,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Trigger Success
                </button>
            </div>
        </div>
    );
}