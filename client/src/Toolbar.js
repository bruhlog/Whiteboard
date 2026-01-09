function Toolbar({
  color,
  setColor,
  size,
  setSize,
  clear,
  undo,
  redo,
  save
}) {
  return (
    <div
      style={{
        marginBottom: 10,
        display: "flex",
        gap: 10,
        alignItems: "center"
      }}
    >
      {/* Color Picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

      {/* Brush Size */}
      <input
        type="range"
        min="1"
        max="10"
        value={size}
        onChange={(e) => setSize(Number(e.target.value))}
      />

      {/* Controls */}
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={clear}>Clear</button>
      <button onClick={save}>Save</button>

    </div>
  );
}

export default Toolbar;
