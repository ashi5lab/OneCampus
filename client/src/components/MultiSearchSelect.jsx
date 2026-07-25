import { useState, useRef, useEffect } from 'react';

// Multi-select combobox — selected items appear as chips; the search input
// sits inline after the chips. Keyboard-navigable. Options are filtered
// client-side (same assumption as SearchSelect: tenant-scoped lists).
export function MultiSearchSelect({
  options,
  values = [],
  onChange,
  placeholder = 'Search…',
  disabled = false,
  emptyMessage = 'No matches.',
  renderOption,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const valueSet = new Set(values.map(String));
  const selectedOptions = options.filter(o => valueSet.has(String(o.value)));
  const filtered = options.filter(
    o => !valueSet.has(String(o.value)) && o.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setHighlightedIndex(0); }, [query, isOpen]);

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

  function addValue(option) {
    onChange([...values, option.value]);
    setQuery('');
    setHighlightedIndex(0);
    inputRef.current?.focus();
  }

  function removeValue(val) {
    onChange(values.filter(v => String(v) !== String(val)));
  }

  function handleKeyDown(e) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setIsOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) addValue(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    } else if (e.key === 'Backspace' && query === '' && values.length > 0) {
      removeValue(values[values.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Chip + input row */}
      <div
        className={`input flex min-h-[40px] flex-wrap items-center gap-1.5 py-1.5 cursor-text ${
          disabled ? 'opacity-60 pointer-events-none' : ''
        }`}
        onClick={() => { if (!disabled) { setIsOpen(true); inputRef.current?.focus(); } }}
      >
        {selectedOptions.map(opt => (
          <span
            key={opt.value}
            className="flex items-center gap-1 rounded-full bg-accent-light px-2.5 py-0.5 text-[12px] font-semibold text-accent-dark"
          >
            {opt.label}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeValue(opt.value); }}
              className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-accent-dark opacity-70 hover:opacity-100"
              aria-label={`Remove ${opt.label}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="min-w-[100px] flex-1 border-none bg-transparent p-0 text-base text-ink-900 outline-none placeholder:text-ink-500"
          placeholder={selectedOptions.length === 0 ? placeholder : ''}
          value={query}
          disabled={disabled}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded border border-border bg-surface shadow-md">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-500">{query ? emptyMessage : 'Type to search…'}</li>
          ) : (
            filtered.map((option, idx) => (
              <li
                key={option.value}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlightedIndex ? 'bg-accent-light text-accent-dark' : 'text-ink-900 hover:bg-surface-muted'
                }`}
                onMouseDown={e => { e.preventDefault(); addValue(option); }}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                {renderOption ? renderOption(option) : option.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
