"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/lib/use-mobile"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-100 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function MobileDialogContent({
  className,
  children,
  showCloseButton: _showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null)
  const isDraggingRef = React.useRef(false)
  const startYRef = React.useRef(0)
  const currentYRef = React.useRef(0)
  const startTimeRef = React.useRef(0)

  // Reset transform when opened/mounted
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

    // Dragged down > 80px or fast swipe down
    if (deltaY > 80 || (deltaY > 30 && velocity > 0.4)) {
      contentRef.current.style.transition = "transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)"
      contentRef.current.style.transform = "translateY(100%)"
      setTimeout(() => {
        closeButtonRef.current?.click()
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
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          contentRef.current = node
          const externalRef = (props as any).ref
          if (typeof externalRef === "function") {
            externalRef(node)
          } else if (externalRef && typeof externalRef === "object") {
            externalRef.current = node
          }
        }}
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed inset-x-0 bottom-0 z-100 max-h-[85vh] overflow-y-auto grid gap-4 rounded-t-2xl border-t p-6 pt-3 shadow-lg will-change-transform",
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

        {/* Hidden close button to trigger Radix dismiss programmatically without showing X icon */}
        <DialogPrimitive.Close
          ref={closeButtonRef}
          data-slot="dialog-close"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        >
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileDialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </MobileDialogContent>
    )
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-100 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
