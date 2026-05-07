'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/* ── Captured slide model ─────────────────────────────────────
   Each registered slot represents one slide that the page can
   capture as the visitor scrolls. The viewfinder's metadata
   surface (REC bar, slide counter) reads from these. */

export interface ViewfinderSlide {
  /** Stable id; matches the slot's slot-N order. */
  id: string
  /** Thumbnail image to fill the slot once "captured". */
  thumbnailUrl: string
  /** Active-voice caption shown alongside the thumbnail. */
  caption: string
  /** Position label (defaults to the registration order). */
  position: number
}

export interface ViewfinderContextValue {
  slides: ViewfinderSlide[]
  capturedIds: Set<string>
  capture: (id: string) => void
  /** Triggers a brief paper-flash overlay on the captured section. */
  flashTarget: string | null
}

const ViewfinderContext = createContext<ViewfinderContextValue | null>(null)

export function useViewfinder(): ViewfinderContextValue {
  const ctx = useContext(ViewfinderContext)
  if (!ctx) {
    return {
      slides: [],
      capturedIds: new Set(),
      capture: () => {},
      flashTarget: null,
    }
  }
  return ctx
}

export interface PageViewfinderProps {
  /** Ordered list of slides the page can capture, top-to-bottom. */
  slides: ViewfinderSlide[]
  children: ReactNode
}

/**
 * Page-level "viewfinder" provider for the home page. The page is
 * filmed as the visitor reads it: each registered section captures a
 * slide when it enters the viewport, the navbar's REC indicator and
 * slide counter live-update, and the CaptureStack on the right
 * accumulates filled slots. After all slides are captured, a
 * "Your walkthrough →" CTA activates.
 *
 * Provider-only — does not render UI itself. Consumed by:
 *   - <NavBar> (REC indicator + timecode + slide counter)
 *   - <CaptureStack> (side panel with the slots)
 *   - <SlideCapture> (IntersectionObserver wrapper firing capture())
 *
 * Outside the provider all consumers fall through to safe defaults
 * (empty slides, no captures) so other pages render unchanged.
 */
export function PageViewfinder({ slides, children }: PageViewfinderProps) {
  const [capturedIds, setCapturedIds] = useState<Set<string>>(() => new Set())
  const [flashTarget, setFlashTarget] = useState<string | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const capture = useCallback((id: string) => {
    setCapturedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setFlashTarget(id)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlashTarget(null), 380)
  }, [])

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    },
    [],
  )

  const value = useMemo<ViewfinderContextValue>(
    () => ({ slides, capturedIds, capture, flashTarget }),
    [slides, capturedIds, capture, flashTarget],
  )

  return (
    <ViewfinderContext.Provider value={value}>
      {children}
      {/* Corner brackets on the viewport — fixed, decorative, hide
          on small screens. The body has nothing else to do; brackets
          are the lens of the camera. */}
      <ViewportBrackets />
    </ViewfinderContext.Provider>
  )
}

/**
 * Four L-shaped vermillion brackets at the viewport corners. Subtle
 * but unmistakably a viewfinder cue. Hidden on mobile to avoid
 * fighting the hand for screen real estate.
 */
function ViewportBrackets() {
  const ctx = useViewfinder()
  if (ctx.slides.length === 0) return null

  return (
    <>
      <Bracket position="top-left" />
      <Bracket position="top-right" />
      <Bracket position="bottom-left" />
      <Bracket position="bottom-right" />
    </>
  )
}

function Bracket({
  position,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}) {
  const placement = {
    'top-left': 'top-3 left-3',
    'top-right': 'top-3 right-3',
    'bottom-left': 'bottom-3 left-3',
    'bottom-right': 'bottom-3 right-3',
  }[position]

  // Each bracket is a tiny SVG of an L. Rotation orients the L
  // toward its corner.
  const rotation = {
    'top-left': 0,
    'top-right': 90,
    'bottom-right': 180,
    'bottom-left': 270,
  }[position]

  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none fixed z-30 hidden lg:block ${placement}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path
          d="M2 14 V2 H14"
          stroke="var(--color-vermillion-500, #d94824)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
