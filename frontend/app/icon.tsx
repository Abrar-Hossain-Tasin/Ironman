import { ImageResponse } from 'next/og'
import fs from 'fs'
import path from 'path'

// Force Node.js runtime to allow file system access
export const runtime = 'nodejs'

export const alt = 'IRONMAN Laundry'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  try {
    // 1. Get the path to your logo in the public folder
    const filePath = path.join(process.cwd(), 'public', 'Ironman-logo.png')
    
    // 2. Read the file directly from the disk
    const logoData = fs.readFileSync(filePath)
    
    // 3. Convert to ArrayBuffer for ImageResponse
    const logoArrayBuffer = logoData.buffer.slice(
      logoData.byteOffset,
      logoData.byteOffset + logoData.byteLength
    )

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '20%',
          }}
        >
          <img
            src={logoArrayBuffer as any}
            style={{
              width: '80%',
              height: '80%',
              objectFit: 'contain',
            }}
          />
        </div>
      ),
      { ...size }
    )
  } catch (error) {
    // FALLBACK: If the image fails to load, show a simple colored square with "I"
    // This prevents the whole build from crashing
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#000',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            borderRadius: '20%',
          }}
        >
          I
        </div>
      ),
      { ...size }
    )
  }
}