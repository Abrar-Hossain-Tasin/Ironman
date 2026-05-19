'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Sheet = Dialog.Root
const SheetTrigger = Dialog.Trigger
const SheetClose = Dialog.Close
const SheetPortal = Dialog.Portal

const SheetOverlay = forwardRef<
  ElementRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-ironman-navy-dark/40 backdrop-blur-sm transition-opacity duration-200',
      'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

type SheetContentProps = ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: 'left' | 'right'
  hideCloseButton?: boolean
  children?: ReactNode
}

const SheetContent = forwardRef<ElementRef<typeof Dialog.Content>, SheetContentProps>(
  ({ className, children, side = 'right', hideCloseButton, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        ref={ref}
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-full max-w-md flex-col gap-4 bg-white shadow-2xl transition-transform duration-300 ease-out',
          side === 'right'
            ? 'right-0 border-l border-ironman-navy-100 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0'
            : 'left-0 border-r border-ironman-navy-100 data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0',
          className
        )}
        {...props}
      >
        {children}
        {hideCloseButton ? null : (
          <Dialog.Close
            aria-label="Close"
            className="focus-ring absolute right-4 top-4 rounded-md p-1 text-ironman-navy/70 hover:bg-ironman-navy-50 hover:text-ironman-navy"
          >
            <X className="h-4 w-4" aria-hidden />
          </Dialog.Close>
        )}
      </Dialog.Content>
    </SheetPortal>
  )
)
SheetContent.displayName = 'SheetContent'

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 border-b border-ironman-navy-100 px-6 py-4', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-auto flex items-center justify-end gap-2 border-t border-ironman-navy-100 px-6 py-4', className)}
      {...props}
    />
  )
}

const SheetTitle = forwardRef<
  ElementRef<typeof Dialog.Title>,
  ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-base font-bold text-ironman-navy', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = forwardRef<
  ElementRef<typeof Dialog.Description>,
  ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description ref={ref} className={cn('text-xs text-gray-500', className)} {...props} />
))
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
}
