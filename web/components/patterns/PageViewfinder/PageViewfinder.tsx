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

const FLY_DURATION_MS = 800

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
      // Always set the flash + the captured id; the flying-card layer is
      // optional polish that requires both refs.
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      setFlashTarget(id)
      flashTimerRef.current = setTimeout(() => setFlashTarget(null), 380)

      // Compute the rects for the flying overlay. If either is missing
      // (mobile, slot not yet mounted, etc.) we just mark the slide
      // captured immediately and skip the flight.
      const sectionEl = document.querySelector(
        `[data-slide-id="${id}"]`,
      ) as HTMLElement | null
      const slotEl = slotRefs.current.get(id)

      if (reduce || !sectionEl || !slotEl) {
        markCaptured(id)
        return
      }

      const sectionRect = sectionEl.getBoundingClientRect()
      const slotRect = slotEl.getBoundingClientRect()

      // Compute the starting pose of the flying card. We center it
      // horizontally within the section and place its top near the
      // section's top — that's roughly at the visitor's eye-level
      // when the section first enters the viewport.
      const cardW = Math.min(280, Math.max(200, sectionRect.width * 0.4))
      const cardH = (cardW / 16) * 9
      const fromTop = Math.max(
        80,
        Math.min(
          sectionRect.top + 32,
          window.innerHeight - cardH - 24,
        ),
      )
      const fromLeft = sectionRect.left + sectionRect.width / 2 - cardW / 2

      setFlying({
        slideId: id,
        fromRect: {
          top: fromTop,
          left: fromLeft,
          width: cardW,
          height: cardH,
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
    [markCaptured, reduce],
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
        {flying && flyingSlide ? (
          <FlyingCard key={flying.slideId} flying={flying} slide={flyingSlide} />
        ) : null}
      </AnimatePresence>
    </ViewfinderContext.Provider>
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
  return (
    <motion.div
      initial={{
        position: 'fixed',
        top: flying.fromRect.top - 8,
        left: flying.fromRect.left,
        width: flying.fromRect.width,
        height: flying.fromRect.height,
        scale: 1.04,
        rotate: -2,
        opacity: 0,
        zIndex: 60,
        boxShadow:
          '0 30px 80px -20px rgba(217,72,36,0.25), 0 12px 30px -10px rgba(20,20,19,0.35)',
      }}
      animate={{
        top: flying.toRect.top,
        left: flying.toRect.left,
        width: flying.toRect.width,
        height: flying.toRect.height,
        scale: 1,
        rotate: 0,
        opacity: 1,
      }}
      // Soft exit so a re-fire mid-flight doesn't visually pop.
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.7,
        ease: [0.32, 0.72, 0, 1], // crisp pluck → glide curve
        opacity: { duration: 0.18, ease: [0.2, 0.7, 0.2, 1] },
        scale: { duration: 0.7, ease: [0.32, 0.72, 0, 1] },
        rotate: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      }}
      style={{ pointerEvents: 'none' }}
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

