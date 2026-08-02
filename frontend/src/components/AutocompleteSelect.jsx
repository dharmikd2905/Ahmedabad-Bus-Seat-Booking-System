import { useEffect, useMemo, useState, useRef } from "react";

export default function AutocompleteSelect({ label, options, value, onChange, placeholder, disabled = false }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return options.slice(0, 12);
    return options
      .filter((option) => option.toLowerCase().includes(clean))
      .slice(0, 12);
  }, [options, query]);

  // An empty list usually means station data is still loading or the API is
  // unavailable. Do not present it as a failed text search before typing.
  const showMenu = open && (options.length > 0 || query.trim().length > 0);

  function selectOption(nextValue) {
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onInputKeyDown(event) {
    if (!open && event.key === "ArrowDown") {
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= filtered.length ? 0 : prev + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      selectOption(filtered[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="auto-wrap" ref={wrapRef}>
      <label className="field-label">{label}</label>
      <input
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onInputKeyDown}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
      />
      {showMenu ? (
        <div className="auto-menu">
          {filtered.length ? (
            filtered.map((option, index) => (
              <button
                key={option}
                className={`auto-item ${index === activeIndex ? "active" : ""}`}
                type="button"
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="auto-empty">No matching stations</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
