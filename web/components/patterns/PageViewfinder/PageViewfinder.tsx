'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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

/* ── Captured slide model ───────────────────────────────────── */

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

interface FlyingCapture {
  slideId: string
  fromRect: { top: number; left: number; width: number; height: number }
  toRect: { top: number; left: number; width: number; height: number }
}

export interface ViewfinderContextValue {
  slides: ViewfinderSlide[]
  capturedIds: Set<string>
  capture: (id: string) => void
  /** Section id currently flashing paper-white. */
  flashTarget: string | null
  /**
   * Slot DOM nodes register themselves here so the capture animation
   * can compute the destination rect for the flying overlay.
   */
  registerSlot: (slideId: string, node: HTMLElement | null) => void
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
      registerSlot: () => {},
    }
  }
  return ctx
}

export interface PageViewfinderProps {
  /** Ordered list of slides the page can capture, top-to-bottom. */
  slides: ViewfinderSlide[]
  children: ReactNode
}

const FLY_DURATION_MS = 950

/**
 * Page-level "viewfinder" provider. The page is filmed as the visitor
 * reads it: each registered section captures a slide when it enters
 * the viewport, the navbar's REC indicator and slide counter live-
 * update, and the CaptureStack on the right accumulates filled slots.
 *
 * The capture moment is cinematographic: when a section captures, the
 * section flashes paper-white briefly (camera-shutter feel) and a
 * thumbnail card flies from the section's position into its slot in
 * the side panel. The slot fills only when the flying card lands.
 *
 * Outside the provider all consumers fall through to safe defaults
 * (empty slides, no captures) so other pages render unchanged.
 */
export function PageViewfinder({ slides, children }: PageViewfinderProps) {
  const reduce = useReducedMotion()
  const [capturedIds, setCapturedIds] = useState<Set<string>>(() => new Set())
  const [flashTarget, setFlashTarget] = useState<string | null>(null)
  const [flying, setFlying] = useState<FlyingCapture | null>(null)
  const slotRefs = useRef<Map<string, HTMLElement>>(new Map())
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const landTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const registerSlot = useCallback(
    (slideId: string, node: HTMLElement | null) => {
      if (node) slotRefs.current.set(slideId, node)
      else slotRefs.current.delete(slideId)
    },
    [],
  )

  const markCaptured = useCallback((id: string) => {
    setCapturedIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const capture = useCallback(
    (id: string) => {
      // Order-preserving capture: if a section fires out of order
      // (visitor lands mid-page or scrolls up to it first), silently
      // backfill every earlier slot so the stack reads top-to-bottom
      // 01 → 02 → 03 → 04 regardless of visit path. Earlier slots
      // skip the flash + flight; only the *actually triggered* slide
      // gets the animated capture.
      const idx = slides.findIndex((s) => s.id === id)
      if (idx > 0) {
        setCapturedIds((prev) => {
          let changed = false
          const next = new Set(prev)
          for (let i = 0; i < idx; i++) {
            const earlierId = slides[i]?.id
            if (earlierId && !next.has(earlierId)) {
              next.add(earlierId)
              changed = true
            }
          }
          return changed ? next : prev
        })
      }

      // Always set the flash + the captured id; the flying-card layer is
      // optional polish that requires both refs.
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setFlashTarget(id)
      flashTimerRef.current = setTimeout(() => setFlashTarget(null), 380)

      // Resolve the destination slot in the widget rail. Without it
      // there's nowhere to fly to — fall through to instant fill.
      const slotEl = slotRefs.current.get(id)
      if (reduce || !slotEl) {
        markCaptured(id)
        return
      }

      // The card lifts off from the WHOLE content column the visitor is
      // looking at (the <main> element's visible rect in the viewport)
      // — not from a section-sized slice — so the snap reads as "this
      // entire view got captured", which is what's actually happening.
      // Falls back to the full viewport when <main> isn't mounted.
      const mainEl = document.querySelector('main')
      const mainRect = mainEl?.getBoundingClientRect()

      const fromLeft = mainRect ? mainRect.left : 0
      const fromWidth = mainRect ? mainRect.width : window.innerWidth
      const fromTop = mainRect ? Math.max(0, mainRect.top) : 0
      const fromBottom = mainRect
        ? Math.min(window.innerHeight, mainRect.bottom)
        : window.innerHeight
      const fromHeight = Math.max(120, fromBottom - fromTop)

      const slotRect = slotEl.getBoundingClientRect()

      setFlying({
        slideId: id,
        fromRect: {
          top: fromTop,
          left: fromLeft,
          width: fromWidth,
          height: fromHeight,
        },
        toRect: {
          top: slotRect.top,
          left: slotRect.left,
          width: slotRect.width,
          height: slotRect.height,
        },
      })

      if (landTimerRef.current) clearTimeout(landTimerRef.current)
      landTimerRef.current = setTimeout(() => {
        markCaptured(id)
        setFlying(null)
      }, FLY_DURATION_MS)
    },
    [markCaptured, reduce, slides],
  )

  useEffect(
    () => () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      if (landTimerRef.current) clearTimeout(landTimerRef.current)
    },
    [],
  )

  const value = useMemo<ViewfinderContextValue>(
    () => ({ slides, capturedIds, capture, flashTarget, registerSlot }),
    [slides, capturedIds, capture, flashTarget, registerSlot],
  )

  // The flying card needs the slide data to render its thumbnail.
  const flyingSlide = flying
    ? slides.find((s) => s.id === flying.slideId)
    : null

  return (
    <ViewfinderContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {flashTarget ? <ShutterFlash key={flashTarget} /> : null}
      </AnimatePresence>
      <AnimatePresence>
        {flying && flyingSlide ? (
          <FlyingCard key={flying.slideId} flying={flying} slide={flyingSlide} />
        ) : null}
      </AnimatePresence>
    </ViewfinderContext.Provider>
  )
}

/* ── Shutter flash ──────────────────────────────────────────
   A viewport-wide paper-white pulse — sells the "snap" moment
   visually so the flying card feels like the photo that was
   just taken, not a generic widget animation. */

function ShutterFlash() {
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[55] bg-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.55, 0] }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, times: [0, 0.18, 1], ease: 'easeOut' }}
    />
  )
}

/* ── Flying capture card ──────────────────────────────────── */

function FlyingCard({
  flying,
  slide,
}: {
  flying: FlyingCapture
  slide: ViewfinderSlide
}) {
  // Three-phase choreography keyed off the shutter:
  //   0–18%  the photo materializes at full content-column size right
  //          where the visitor was looking (the shutter flash overlay
  //          covers the transition so the materialization reads as
  //          "the screen turned into a photo")
  //   18–28% brief hold at full size — the visitor registers this is
  //          a snapshot of what they were just looking at
  //   28–100% shrinks + flies to the destination slot in the rail
  return (
    <motion.div
      initial={{
        position: 'fixed',
        top: flying.fromRect.top,
        left: flying.fromRect.left,
        width: flying.fromRect.width,
        height: flying.fromRect.height,
        opacity: 0,
        zIndex: 60,
      }}
      animate={{
        top: [
          flying.fromRect.top,
          flying.fromRect.top,
          flying.fromRect.top,
          flying.toRect.top,
        ],
        left: [
          flying.fromRect.left,
          flying.fromRect.left,
          flying.fromRect.left,
          flying.toRect.left,
        ],
        width: [
          flying.fromRect.width,
          flying.fromRect.width,
          flying.fromRect.width,
          flying.toRect.width,
        ],
        height: [
          flying.fromRect.height,
          flying.fromRect.height,
          flying.fromRect.height,
          flying.toRect.height,
        ],
        opacity: [0, 1, 1, 1],
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.95,
        times: [0, 0.18, 0.28, 1],
        ease: [0.32, 0.72, 0, 1],
        opacity: { duration: 0.22, ease: [0.2, 0.7, 0.2, 1] },
      }}
      style={{
        pointerEvents: 'none',
        boxShadow:
          '0 30px 80px -20px rgba(217,72,36,0.22), 0 14px 36px -12px rgba(20,20,19,0.32)',
      }}
      className="overflow-hidden rounded-[10px] border border-vermillion-500/50 bg-paper"
    >
      <div className="size-full overflow-hidden bg-paper-oat">
        <img
          src={slide.thumbnailUrl}
          alt=""
          className="size-full object-cover"
        />
      </div>
      <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-vermillion-500/20" />
    </motion.div>
  )
}

