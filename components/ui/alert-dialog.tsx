"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useIsMobile } from "@/lib/use-mobile"

function AlertDialog({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  )
}

function AlertDialogPortal({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Portal>) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  )
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function MobileAlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const cancelRef = React.useRef<HTMLButtonElement | null>(null)
  const isDraggingRef = React.useRef(false)
  const startYRef = React.useRef(0)
  const currentYRef = React.useRef(0)
  const startTimeRef = React.useRef(0)

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.transform = ""
      contentRef.current.style.transition = ""
    }
  }, [])

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    isDraggingRef.current = true
    startYRef.current = e.clientY
    currentYRef.current = 0
    startTimeRef.current = Date.now()

    if (contentRef.current) {
      contentRef.current.style.transition = "none"
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !contentRef.current) return
    const deltaY = e.clientY - startYRef.current
    if (deltaY > 0) {
      currentYRef.current = deltaY
      contentRef.current.style.transform = `translateY(${deltaY}px)`
    } else {
      const resistance = deltaY * 0.15
      currentYRef.current = resistance
      contentRef.current.style.transform = `translateY(${resistance}px)`
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    } catch {
      // ignore
    }

    if (!contentRef.current) return

    const deltaY = currentYRef.current
    const elapsed = Date.now() - startTimeRef.current
    const velocity = deltaY / Math.max(elapsed, 1)

    if (deltaY > 80 || (deltaY > 30 && velocity > 0.4)) {
      contentRef.current.style.transition = "transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)"
      contentRef.current.style.transform = "translateY(100%)"
      setTimeout(() => {
        cancelRef.current?.click()
      }, 160)
    } else {
      contentRef.current.style.transition = "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
      contentRef.current.style.transform = "translateY(0)"
    }
  }

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (contentRef.current) {
      contentRef.current.style.transition = "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)"
      contentRef.current.style.transform = "translateY(0)"
    }
  }

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={(node) => {
          contentRef.current = node
          const externalRef = (props as any).ref
          if (typeof externalRef === "function") {
            externalRef(node)
          } else if (externalRef && typeof externalRef === "object") {
            externalRef.current = node
          }
        }}
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-[200] max-h-[85vh] overflow-y-auto grid gap-4 rounded-t-2xl border-t p-6 pt-3 shadow-lg will-change-transform",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "duration-300",
          className
        )}
        {...props}
      >
        {/* Draggable notch handle */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Drag down to close"
          className="mx-auto -mt-1 -mb-1 flex w-full max-w-xs cursor-grab items-center justify-center py-2.5 active:cursor-grabbing touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div className="h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors" />
        </div>

        {children}

        {/* Hidden cancel button to trigger AlertDialog dismiss programmatically */}
        <AlertDialogPrimitive.Cancel
          ref={cancelRef}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <span className="sr-only">Cancel</span>
        </AlertDialogPrimitive.Cancel>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileAlertDialogContent className={className} {...props}>
        {children}
      </MobileAlertDialogContent>
    )
  }

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[200] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
