import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/format";
import { Input } from "@/components/ui";

export interface SearchSelectOption {
  value: string;
  label: string;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

interface SearchSelectProps {
  id?: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto que se muestra cuando no hay valor seleccionado (ej. "Personalizado"). */
  emptyLabel?: string;
  /** Permite vaciar la selección con una X. */
  clearable?: boolean;
  /** Etiqueta de la opción fija "+ Crear nuevo" al principio de la lista. */
  createLabel?: string;
  onCreate?: () => void;
  disabled?: boolean;
}

export function SearchSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
  clearable,
  createLabel,
  onCreate,
  disabled,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const displayValue = open ? query : selectedLabel || emptyLabel || "";

  const needle = normalize(query.trim());
  const filtered = needle ? options.filter((o) => normalize(o.label).includes(needle)) : options;
  const showCreate = Boolean(createLabel && onCreate);
  // La opción de crear va primera; las opciones reales arrancan después.
  const firstOptionIndex = showCreate ? 1 : 0;
  const totalItems = filtered.length + (showCreate ? 1 : 0);
  const safeActive = totalItems === 0 ? -1 : Math.min(activeIndex, totalItems - 1);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [open, safeActive]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function select(optionValue: string) {
    onChange(optionValue);
    close();
  }

  function handleCreate() {
    close();
    onCreate?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(firstOptionIndex);
        return;
      }
      if (totalItems > 0) setActiveIndex((i) => (i + 1) % totalItems);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(Math.max(totalItems - 1, 0));
        return;
      }
      if (totalItems > 0) setActiveIndex((i) => (i - 1 + totalItems) % totalItems);
      return;
    }
    if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      if (safeActive < 0) return;
      if (showCreate && safeActive === 0) handleCreate();
      else if (filtered[safeActive - firstOptionIndex]) select(filtered[safeActive - firstOptionIndex].value);
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        // No cerrar el modal padre: el dropdown tiene prioridad.
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === "Tab") close();
  }

  return (
    <div ref={wrapRef} className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" aria-hidden="true">
        <Search className="size-4" />
      </span>
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && safeActive >= 0 ? `${listId}-${safeActive}` : undefined}
        autoComplete="off"
        disabled={disabled}
        className={cn("pl-9", clearable && value && "pr-8")}
        value={displayValue}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />

      {clearable && value !== "" && !disabled && (
        <button
          type="button"
          aria-label="Quitar selección"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={placeholder ?? "Opciones"}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-xl"
        >
      {filtered.map((option, index) => {
        const realIndex = firstOptionIndex + index;
        const active = realIndex === safeActive;
        return (
          <li
            key={option.value}
            id={`${listId}-${realIndex}`}
            role="option"
            aria-selected={option.value === value}
            data-active={active}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActiveIndex(realIndex)}
            onClick={() => select(option.value)}
            className={cn(
              "cursor-pointer px-3 py-2 text-sm",
              active && "bg-ink/10",
              option.value === value && "font-semibold text-primary",
            )}
          >
            {option.label}
          </li>
        );
      })}

      {filtered.length === 0 && !showCreate && (
        <li className="px-3 py-2 text-sm text-muted">Sin resultados</li>
      )}

      {showCreate && (
        <li
          id={`${listId}-0`}
          role="option"
          aria-selected={false}
          data-active={safeActive === 0}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setActiveIndex(0)}
          onClick={handleCreate}
          className={cn(
            "flex cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-sm font-semibold text-primary",
            safeActive === 0 && "bg-primary-soft",
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          {createLabel}
        </li>
      )}
        </ul>
      )}
    </div>
  );
}
