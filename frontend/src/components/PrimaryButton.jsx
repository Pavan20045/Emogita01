import React from "react";

export default function PrimaryButton({
  children,
  onClick,
  type = "button",
  variant = "primary", // primary, secondary, quiet, danger
  loading = false,
  disabled = false,
  className = "",
  style = {},
  ariaLabel,
  ...props
}) {
  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return "btn-secondary";
      case "quiet":
        return "btn-quiet";
      case "danger":
        return "btn-danger";
      case "primary":
      default:
        return "btn-primary";
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={ariaLabel}
      className={`btn ${getVariantClass()} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <span
            className="loader-ring"
            style={{ width: "18px", height: "18px", borderWidth: "2px" }}
            aria-hidden="true"
          />
          <span>{children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
