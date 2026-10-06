interface PlaceholderProps {
  title: string
  note?: string
}

/** 아직 만들지 않은 화면 자리 */
export default function Placeholder({ title, note }: PlaceholderProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-extrabold">{title}</h1>
      {note && <p className="text-sm text-ink-sub">{note}</p>}
    </main>
  )
}
