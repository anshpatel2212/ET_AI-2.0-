'use client'

import { io, Socket } from 'socket.io-client'
import { WS_URL } from './constants'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message)
    })
  }
  return socket
}

export function subscribeToCity(city: string) {
  const s = getSocket()
  s.emit('subscribe:city', { city })
}

export function subscribeToStation(stationId: string) {
  const s = getSocket()
  s.emit('subscribe:station', { stationId })
}

export function unsubscribe(channel: string) {
  const s = getSocket()
  s.emit('unsubscribe', { channel })
}

export function onAQIUpdate(callback: (data: any) => void) {
  getSocket().on('aqi-update', callback)
  return () => getSocket().off('aqi-update', callback)
}

export function onAlert(callback: (data: any) => void) {
  getSocket().on('alert', callback)
  return () => getSocket().off('alert', callback)
}

export function onPredictionUpdate(callback: (data: any) => void) {
  getSocket().on('prediction-update', callback)
  return () => getSocket().off('prediction-update', callback)
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
