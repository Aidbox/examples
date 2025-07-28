import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Practitioner Portal - Aidbox OrgBAC',
  description: 'Practitioner facing application with Organization Based Access Control',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}