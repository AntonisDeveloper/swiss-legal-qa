import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Swiss Legal Q&A',
  description: 'Ask questions about Swiss law and get answers based on the Swiss Civil Code',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
} 