import * as React from "react"
import cn from "./utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base visual style — no border, gentle background
        "flex h-10 w-full rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-900 shadow-sm",
        // Placeholder + selection
        "placeholder:text-gray-400 selection:bg-emerald-100 selection:text-emerald-900",
        // Focus ring (emerald brand glow)
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0",
        // Disabled + invalid
        "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-red-300",
        // Dark mode variant (slightly darker fill, soft inner shadow)
        "dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus-visible:ring-emerald-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }
