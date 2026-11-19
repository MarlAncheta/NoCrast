import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-[min(32rem,92vw)] rounded-card border border-white/8 bg-panel text-snow p-6 backdrop:bg-black/70"
    >
      <h2 id="modal-title" className="mb-4 text-2xl font-black">
        {title}
      </h2>
      {children}
    </dialog>
  )
}
