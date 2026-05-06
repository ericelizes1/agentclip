/**
 * Deterministic gradient + initials helpers for the creator credit avatar.
 *
 * The same name always produces the same gradient. The hash is fast and
 * stable across runs (FNV-ish over UTF-16 code units). Two HSL stops
 * 60° apart on the wheel give a vivid but cohesive sweep — never a muddy
 * brown, never a clashing complementary pair.
 */

export interface GradientAvatar {
  initials: string
  gradient: string
  text: string
}

function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function deriveInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) {
    const word = parts[0]!
    return word.slice(0, 2).toUpperCase()
  }
  const first = parts[0]!.charAt(0)
  const last = parts[parts.length - 1]!.charAt(0)
  return (first + last).toUpperCase()
}

export function gradientFor(name: string): GradientAvatar {
  const seed = hashString(name || 'anonymous')
  // Two complementary-ish hues, offset by 50° so the gradient sweeps
  // through related colors instead of grey midpoints.
  const baseHue = seed % 360
  const altHue = (baseHue + 50) % 360
  const sat1 = 65 + (seed % 15) // 65–79
  const sat2 = 70 + ((seed >> 8) % 15) // 70–84
  const light1 = 48 + ((seed >> 4) % 8) // 48–55
  const light2 = 55 + ((seed >> 12) % 8) // 55–62
  const angle = (seed >> 16) % 360
  return {
    initials: deriveInitials(name),
    gradient: `linear-gradient(${angle}deg, hsl(${baseHue} ${sat1}% ${light1}%), hsl(${altHue} ${sat2}% ${light2}%))`,
    // Always a high-contrast text color; HSL light values are bounded so
    // white-on-gradient stays legible without an extra lookup.
    text: '#ffffff',
  }
}
