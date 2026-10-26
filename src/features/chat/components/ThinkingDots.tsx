export default function ThinkingDots({ label = '답변을 준비하고 있어요' }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex gap-[5px] py-1">
      {[0, 0.15, 0.3].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="tm-dot h-[7px] w-[7px] rounded-full bg-brand opacity-35"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </span>
  )
}
