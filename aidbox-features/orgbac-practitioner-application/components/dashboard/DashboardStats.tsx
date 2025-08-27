'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'

interface Stats {
  totalPatients: number
  todayAppointments: number
  pendingTasks: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayAppointments: 0,
    pendingTasks: 0
  })

  useEffect(() => {
    // Fetch stats from API
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const statCards = [
    {
      name: 'Total Patients',
      value: stats.totalPatients,
      icon: '👥',
      change: '',
      changeType: 'positive' as const
    },
    {
      name: "Today's Appointments",
      value: stats.todayAppointments,
      icon: '📅',
      change: '3 upcoming',
      changeType: 'neutral' as const
    },
    {
      name: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: '📋',
      change: '2 urgent',
      changeType: 'warning' as const
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.name} className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-3xl">{stat.icon}</span>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {stat.name}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {stat.value}
                  </div>
                  <div className={`ml-2 text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'warning' ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {stat.change}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}