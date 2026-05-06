import { ImageResponse } from 'next/og'

// Next.js renders this route to /icon for browser tabs and social
// previews. ImageResponse runs in the edge runtime so the SVG markup
// here is what gets baked into the PNG — keep it self-contained
// (no imports of the React TicketMark, since edge can't load arbitrary
// component trees).

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#FAF7F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Square cropping: ticket sits centered with the perforation
            shifted slightly so the stub reads at favicon scale. */}
        <svg width="56" height="35" viewBox="0 0 32 20" xmlns="http://www.w3.org/2000/svg">
          <rect
            x="1"
            y="2"
            width="30"
            height="16"
            rx="2.5"
            ry="2.5"
            fill="#E04A2B"
          />
          <line
            x1="11"
            y1="3.5"
            x2="11"
            y2="16.5"
            stroke="#FAF7F2"
            strokeWidth="0.9"
            strokeDasharray="1.2 1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  )
}
