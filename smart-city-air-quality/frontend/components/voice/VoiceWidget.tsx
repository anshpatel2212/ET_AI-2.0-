'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getCurrentAQI, getForecast, getHealthAdvisory, getActiveAlerts } from '@/lib/api'
import type { AqiCurrentResponse, ForecastPoint, HealthAdvisoryResponse, Alert } from '@/lib/api'
import { Mic, MicOff, X, Volume2, Navigation, Map, AlertTriangle, Send, Home, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface VoiceCommand {
  intent: string
  action: () => void
  keywords: string[]
  responseGenerator: () => Promise<string>
}

const FALLBACK_RESPONSE = "I didn't understand that command. Try saying: what's the AQI, show the map, or is it safe for children."

export function VoiceWidget() {
  const [isListening, setIsListening] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const router = useRouter()
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)

  const commands: VoiceCommand[] = [
    {
      intent: 'current_aqi',
      keywords: ['aqi', 'air quality', 'pollution level', 'how is the air'],
      action: () => router.push('/monitor'),
      responseGenerator: async () => {
        const result = await getCurrentAQI()
        if (result.error) return `Sorry, I couldn't fetch the AQI data. ${result.error}`
        if (!result.data) return 'No AQI data available at the moment.'
        const d = result.data
        return `The current AQI in ${d.station?.stationName || 'Ahmedabad'} is ${d.aqi}, which is ${d.aqiCategory || 'moderate'}. ${d.healthAdvice || 'Please take necessary precautions.'} Source: ${d.source} (${Math.round((d.confidence || 0) * 100)}% confidence).`
      },
    },
    {
      intent: 'forecast',
      keywords: ['forecast', 'prediction', 'will it be better', 'tomorrow'],
      action: () => router.push('/predict'),
      responseGenerator: async () => {
        const result = await getForecast('Ahmedabad', '24h')
        if (result.error) return `Sorry, I couldn't fetch the forecast. ${result.error}`
        if (!result.data || result.data.length === 0) return 'No forecast data available at the moment.'
        const latest = result.data[result.data.length - 1]
        return `The AQI is predicted to be around ${Math.round(latest.value)} over the next period${latest.confidence ? ` (${Math.round(latest.confidence * 100)}% confidence)` : ''}. Check the forecast page for detailed hourly data.`
      },
    },
    {
      intent: 'health_advice',
      keywords: ['safe', 'health', 'child', 'children', 'elderly', 'asthma', 'breathe'],
      action: () => router.push('/health'),
      responseGenerator: async () => {
        const aqiResult = await getCurrentAQI()
        if (aqiResult.error) return `Sorry, I couldn't fetch health advice. ${aqiResult.error}`
        const advisoryResult = await getHealthAdvisory(23.0225, 72.5714, 'general')
        if (advisoryResult.data) {
          return `Health advisory: ${advisoryResult.data.advice}. Risk level: ${advisoryResult.data.riskLevel}. ${advisoryResult.data.safeHours?.length > 0 ? `Safe hours: ${advisoryResult.data.safeHours.join(', ')}` : 'Take necessary precautions.'}`
        }
        if (aqiResult.data?.healthAdvice) {
          return `For the current AQI level (${aqiResult.data.aqi}): ${aqiResult.data.healthAdvice}`
        }
        return 'Health advice is not available right now. Please visit the Health page for detailed guidance based on your profile.'
      },
    },
    {
      intent: 'report',
      keywords: ['report', 'smoke', 'burning', 'complaint', 'incident'],
      responseGenerator: async () => {
        return 'Opening the citizen report form. You can report pollution incidents there.'
      },
      action: () => router.push('/citizen'),
    },
    {
      intent: 'map',
      keywords: ['map', 'show pollution', 'where', 'location', 'area'],
      responseGenerator: async () => {
        return 'Opening the pollution map. You can see real-time AQI across Ahmedabad.'
      },
      action: () => router.push('/map'),
    },
    {
      intent: 'alerts',
      keywords: ['alert', 'warning', 'danger', 'emergency'],
      action: () => router.push('/alerts'),
      responseGenerator: async () => {
        const result = await getActiveAlerts()
        if (result.error) return `Sorry, I couldn't fetch alerts. ${result.error}`
        if (!result.data || result.data.length === 0) return 'No active alerts at this time.'
        const alerts = result.data.slice(0, 3)
        const descriptions = alerts.map(a => `${a.severity.toUpperCase()}: ${a.title} in ${a.area}`).join('. ')
        return `There are ${result.data.length} active alert${result.data.length > 1 ? 's' : ''}. ${descriptions}. Check the alerts page for full details.`
      },
    },
    {
      intent: 'home',
      keywords: ['home', 'dashboard', 'main', 'back'],
      responseGenerator: async () => {
        return 'Going back to the home dashboard.'
      },
      action: () => router.push('/'),
    },
    {
      intent: 'help',
      keywords: ['help', 'commands', 'what can you do', 'hi', 'hello'],
      responseGenerator: async () => {
        return 'I can help you check AQI levels, forecasts, health advice, report incidents, show maps, and alerts. Try saying: what is the AQI, show me the map, or is it safe for children.'
      },
      action: () => {},
    },
  ]

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return
    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-IN'
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    synthRef.current.speak(utterance)
  }, [])

  const processCommand = useCallback(async (text: string) => {
    setTranscript(text)
    const lower = text.toLowerCase()

    for (const cmd of commands) {
      if (cmd.keywords.some((kw) => lower.includes(kw))) {
        setIsProcessing(true)
        try {
          const responseText = await cmd.responseGenerator()
          setResponse(responseText)
          speak(responseText)
          setTimeout(() => cmd.action(), 1500)
        } catch {
          const errMsg = 'Sorry, there was an error processing your request. Please try again.'
          setResponse(errMsg)
          speak(errMsg)
        }
        setIsProcessing(false)
        return
      }
    }

    setResponse(FALLBACK_RESPONSE)
    speak(FALLBACK_RESPONSE)
  }, [commands, speak])

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setResponse('Speech recognition is not supported in your browser.')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-IN'
    recognitionRef.current = recognition

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      processCommand(text)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setResponse('Sorry, I could not hear you clearly. Please try again.')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.start()
    setIsListening(true)
    setResponse('Listening...')
    setTranscript('')
  }, [processCommand])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    if (!response) {
      setResponse('Voice command cancelled.')
    }
  }, [response])

  const toggleWidget = useCallback(() => {
    setIsOpen((prev) => !prev)
    if (!isOpen) {
      setResponse('')
      setTranscript('')
    } else {
      if (isListening) stopListening()
      if (isSpeaking) synthRef.current?.cancel()
    }
  }, [isOpen, isListening, isSpeaking, stopListening])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
      if (synthRef.current) synthRef.current.cancel()
    }
  }, [])

  return (
    <>
      <motion.button
        className={cn(
          'fixed bottom-6 right-6 z-50 p-4 rounded-full glass shadow-lg',
          'hover:shadow-neon-md transition-all duration-300',
          isListening && 'animate-pulse-glow'
        )}
        onClick={toggleWidget}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isListening ? (
          <MicOff className="h-6 w-6 text-neon-danger" />
        ) : (
          <Mic className="h-6 w-6 text-neon-primary" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-80 glass-strong rounded-2xl overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 border-b border-neon-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-neon-primary" />
                  <span className="text-sm font-medium text-text-primary">Voice Assistant</span>
                </div>
                <button
                  onClick={toggleWidget}
                  className="text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4 min-h-[120px]">
              {isListening && (
                <div className="flex items-center gap-2 mb-3">
                  <motion.div
                    className="flex gap-1"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-neon-primary"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </motion.div>
                  <span className="text-sm text-neon-primary">Listening...</span>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-4 w-4 text-neon-primary animate-spin" />
                  <span className="text-sm text-text-secondary">Fetching data...</span>
                </div>
              )}

              {transcript && (
                <div className="mb-3">
                  <p className="text-xs text-text-secondary mb-1">You said:</p>
                  <p className="text-sm text-text-primary bg-bg-tertiary/50 rounded-lg p-2">
                    "{transcript}"
                  </p>
                </div>
              )}

              {response && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">Assistant:</p>
                  <div className="flex items-start gap-2">
                    <Volume2 className={cn('h-4 w-4 mt-0.5 shrink-0', isSpeaking ? 'text-neon-primary' : 'text-text-secondary')} />
                    <p className="text-sm text-text-primary">{response}</p>
                  </div>
                </div>
              )}

              {!transcript && !response && !isListening && !isProcessing && (
                <div className="text-center py-4">
                  <Mic className="h-8 w-8 text-text-secondary mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">Tap the mic and try saying:</p>
                  <div className="mt-2 space-y-1">
                    {['"What is the AQI?"', '"Show me the map"', '"Is it safe for children?"', '"Report smoke near me"'].map((hint) => (
                      <p key={hint} className="text-xs text-text-secondary/60">{hint}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-neon-primary/20 flex gap-2">
              <button
                onClick={isListening ? stopListening : startListening}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all',
                  isListening
                    ? 'bg-neon-danger/20 text-neon-danger border border-neon-danger/30'
                    : 'bg-neon-primary/20 text-neon-primary border border-neon-primary/30 hover:bg-neon-primary/30'
                )}
              >
                {isListening ? (
                  <><MicOff className="h-4 w-4" /> Stop</>
                ) : (
                  <><Mic className="h-4 w-4" /> Start</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
