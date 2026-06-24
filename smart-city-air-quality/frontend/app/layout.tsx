import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Header } from '@/components/layout/Header'
import { VoiceWidget } from '@/components/voice/VoiceWidget'

export const metadata: Metadata = {
  title: 'AQI Smart City — Ahmedabad',
  description: 'AI-Powered Urban Air Quality Intelligence Platform for Ahmedabad, India',
  keywords: ['AQI', 'air quality', 'Ahmedabad', 'pollution', 'smart city'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen pt-16">
            {children}
          </main>
          <VoiceWidget />
        </Providers>
      </body>
    </html>
  )
}
