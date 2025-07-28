import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentPatients } from '@/components/dashboard/RecentPatients'
import { QuickActions } from '@/components/dashboard/QuickActions'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to your practice dashboard
        </p>
      </div>

      <DashboardStats />
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickActions />
        <RecentPatients />
      </div>
    </div>
  )
}