import { useTypewriter } from '../useTypewriter'

interface AnswerTextProps {
  text: string
  typing: boolean
  onTyped: () => void
}

export default function AnswerText({ text, typing, onTyped }: AnswerTextProps) {
  const shown = useTypewriter(text, typing, onTyped)
  return (
    <p className="m-0 whitespace-pre-line">
      {shown}
      {typing && shown.length < text.length && (
        <span aria-hidden className="tm-caret ml-0.5 inline-block h-[1em] w-0.5 bg-brand align-[-2px]" />
      )}
    </p>
  )
}
