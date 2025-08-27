import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account and preferences
        </p>
      </div>

      <Card className="p-6">
        <p className="text-gray-500 text-center py-8">
          Settings management is coming soon!
        </p>
      </Card>
    </div>
  )
}