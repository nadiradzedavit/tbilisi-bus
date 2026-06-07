export default function MapVignette() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background:
          "radial-gradient(ellipse at center, transparent 55%, rgba(10,14,26,0.45) 100%)",
        mixBlendMode: "multiply",
      }}
    />
  );
}
