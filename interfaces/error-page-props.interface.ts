export interface IErrorProps {
  error: Error & {digest: string}
  reset: () => void
}
