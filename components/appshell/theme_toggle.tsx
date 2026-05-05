"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "../ui/button"
import { useTheme } from "next-themes"
import { useModeAnimation, ThemeAnimationType } from "react-theme-switch-animation"

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const isDark = resolvedTheme === "dark" || theme === "dark"

    const { ref, toggleSwitchTheme } = useModeAnimation({
        isDarkMode: isDark,
        onDarkModeChange: (newIsDark) => setTheme(newIsDark ? "dark" : "light"),
        animationType: ThemeAnimationType.CIRCLE,
        duration: 500
    })

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            onClick={toggleSwitchTheme}
        >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}