import { useState, useRef, useEffect } from 'react';

// Generic searchable dropdown ("combobox") — a drop-in replacement for a
// plain <select> when the option list can grow large (users, subjects,
// classes, ...). Options are filtered client-side as the user types; this
// assumes a tenant-scoped list (hundreds, not tens of thousands) fetched
// once via React Query, same as every plain <select> it replaces.
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
  emptyMessage = 'No matches.',
  // Optional richer per-row content for the dropdown (e.g. UserSearchSelect's
  // name + username + role-color badge) — option.label stays a plain string
  // throughout, since it's what the closed input's text value and the
  // search-filter match against; a native <input> can't render JSX, so the
  // dropdown is the only place richer content can actually show.
  renderOption
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, isOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectOption(option) {
    onChange(option.value);
    setQuery('');
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) selectOption(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="input"
        disabled={disabled}
        placeholder={selected ? selected.label : placeholder}
        value={isOpen ? query : selected?.label || ''}
        onFocus={() => {
          setIsOpen(true);
          setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
          {filtered.length === 0 && <div className="px-3 py-2 text-xs text-ink-500">{emptyMessage}</div>}
          {filtered.map((option, index) => (
            <button
              type="button"
              key={option.value}
              onClick={() => selectOption(option)}
              className={`block w-full px-3 py-2 text-left text-[13px] ${
                index === highlightedIndex ? 'bg-accent/15' : 'hover:bg-surface-muted'
              } ${String(option.value) === String(value) ? 'font-semibold text-accent-dark' : 'text-ink-900'}`}
            >
              {renderOption ? renderOption(option) : option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
