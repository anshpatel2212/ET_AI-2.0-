'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, Bell, User, ChevronDown, Activity, Map, LineChart, AlertTriangle, Users, Heart, Command, Camera, Globe, BarChart3, Factory } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Activity },
  { href: '/monitor', label: 'Monitor', icon: LineChart },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/predict', label: 'Predict', icon: BarChart3 },
  { href: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/citizen', label: 'Citizen', icon: Users },
  { href: '/health', label: 'Health', icon: Heart },
  { href: '/analytics', label: 'Analytics', icon: LineChart },
  { href: '/sources', label: 'Sources', icon: Factory },
  { href: '/command', label: 'Command', icon: Command },
  { href: '/open-data', label: 'Open Data', icon: Globe },
  { href: '/camera', label: 'Camera', icon: Camera },
]

export function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const cities = ['Ahmedabad', 'Gandhinagar', 'Vadodara', 'Surat', 'Rajkot']

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-neon-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Activity className="h-7 w-7 text-neon-primary group-hover:animate-pulse" />
              <div className="absolute inset-0 bg-neon-primary/20 rounded-full blur-md group-hover:animate-pulse-glow" />
            </div>
            <span className="font-display font-bold text-lg text-text-primary hidden sm:block">
              AQI<span className="text-neon-primary">Smart</span>City
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.slice(0, 8).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'text-neon-primary bg-neon-primary/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-neon-primary/5'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setCityDropdownOpen(!cityDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neon-primary/20 text-sm text-text-secondary hover:border-neon-primary/40 transition-colors"
              >
                <Map className="h-3.5 w-3.5 text-neon-primary" />
                <span>Ahmedabad</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {cityDropdownOpen && (
                  <motion.div
                    className="absolute top-full right-0 mt-2 w-40 glass-strong rounded-xl overflow-hidden shadow-xl z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {cities.map((city) => (
                      <button
                        key={city}
                        className="w-full px-4 py-2.5 text-sm text-text-secondary hover:text-neon-primary hover:bg-neon-primary/5 text-left transition-colors"
                        onClick={() => setCityDropdownOpen(false)}
                      >
                        {city}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className="relative p-2 rounded-lg text-text-secondary hover:text-neon-primary hover:bg-neon-primary/5 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-neon-danger rounded-full animate-pulse" />
            </button>

            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-lg text-text-secondary hover:text-neon-primary hover:bg-neon-primary/5 transition-colors"
              >
                <User className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    className="absolute top-full right-0 mt-2 w-48 glass-strong rounded-xl overflow-hidden shadow-xl z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <Link href="/citizen" className="block px-4 py-2.5 text-sm text-text-secondary hover:text-neon-primary hover:bg-neon-primary/5" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <Link href="/command" className="block px-4 py-2.5 text-sm text-text-secondary hover:text-neon-primary hover:bg-neon-primary/5" onClick={() => setUserMenuOpen(false)}>Admin Panel</Link>
                    <hr className="border-neon-primary/10" />
                    <button className="w-full px-4 py-2.5 text-sm text-neon-danger hover:bg-neon-danger/5 text-left">Logout</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-neon-primary transition-colors"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="lg:hidden border-t border-neon-primary/10"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <nav className="px-4 py-4 space-y-1 max-h-[70vh] overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'text-neon-primary bg-neon-primary/10' : 'text-text-secondary hover:text-text-primary hover:bg-neon-primary/5'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
