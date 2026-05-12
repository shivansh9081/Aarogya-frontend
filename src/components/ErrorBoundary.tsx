import React from "react";

interface State { hasError: boolean; message: string }

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#1a1530", color: "#f0ece8", padding: "2rem", textAlign: "center",
        }}>
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</p>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h2>
          <p style={{ color: "#b8aec8", marginBottom: "1.5rem", maxWidth: 400 }}>
            {this.state.message || "An unexpected error occurred. Please refresh the page."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.6rem 1.5rem", borderRadius: 12, border: "none",
              background: "#a090e0", color: "#fff", cursor: "pointer", fontWeight: 600,
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
