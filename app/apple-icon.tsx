import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0b132b 0%, #1a2947 100%)'
        }}
      >
        <svg width="150" height="150" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="256" cy="256" r="192" fill="#F4F7FB" fillOpacity="0.08"/>
          <path d="M170 156C195 139 223 130 256 130C289 130 317 139 342 156V359C317 342 289 333 256 333C223 333 195 342 170 359V156Z" stroke="#E8F7F6" strokeWidth="22" strokeLinejoin="round"/>
          <path d="M256 166V344" stroke="#63D9D2" strokeWidth="18" strokeLinecap="round"/>
          <path d="M198 210C220 195 238 192 256 203C274 192 292 195 314 210" stroke="#63D9D2" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M198 268C220 253 238 250 256 261C274 250 292 253 314 268" stroke="#63D9D2" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M170 364H342" stroke="#E8F7F6" strokeWidth="18" strokeLinecap="round"/>
        </svg>
      </div>
    ),
    {
      ...size
    }
  )
}
