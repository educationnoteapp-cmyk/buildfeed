'use client'
import { CATEGORIES } from '@/lib/types'

interface CategoryFilterProps {
  selected: string | null
  onChange: (cat: string | null) => void
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
          selected === null
            ? 'bg-primary text-white'
            : 'bg-surface border border-border text-muted hover:text-text hover:border-[#3A3A3A]'
        }`}
      >
        All
      </button>
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(selected === cat.id ? null : cat.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            selected === cat.id
              ? 'bg-primary text-white'
              : 'bg-surface border border-border text-muted hover:text-text hover:border-[#3A3A3A]'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}
