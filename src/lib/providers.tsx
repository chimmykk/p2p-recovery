'use client'

import * as React from 'react'
import { ThemeProvider } from '../components/theme-provider'
import { ThirdwebProvider } from 'thirdweb/react'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            <ThirdwebProvider>
                {children}
            </ThirdwebProvider>
        </ThemeProvider>
    )
}
