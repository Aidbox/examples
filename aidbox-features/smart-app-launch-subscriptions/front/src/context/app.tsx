import { createContext, useContext } from 'react'
import { SmartAppLaunchSubscriptionsConfig } from '../interfaces'

type AppContextProps = {
  config: SmartAppLaunchSubscriptionsConfig
}

const AppContext = createContext<AppContextProps | null>(null)

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export const AppProvider = ({ config, children }: AppContextProps & { children: React.ReactNode }) => {
  return (
    <AppContext.Provider value={{ config }}>
      {children}
    </AppContext.Provider>
  )
}