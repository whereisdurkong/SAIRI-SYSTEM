import React from "react";

export default function LoadingSpinner({ label = "Loading" }) {
    return (
        <div style={styles.wrap}>
            <div style={styles.ring}>
                <div style={{ ...styles.arc, borderTopColor: "#222e69" }} />
                <div style={{ ...styles.arc, ...styles.arcDelay, borderTopColor: "#008042" }} />
            </div>
            <span style={styles.label}>{label}</span>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
        </div>
    );
}

const styles = {
    wrap: {
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, sans-serif",
    },
    ring: {
        position: "relative",
        width: "56px",
        height: "56px",
    },
    arc: {
        position: "absolute",
        inset: 0,
        border: "4px solid transparent",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
    },
    arcDelay: {
        inset: "8px",
        animation: "spin 0.75s linear infinite reverse",
    },
    label: {
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#222e69",
        animation: "pulse 1.4s ease-in-out infinite",
    },
};