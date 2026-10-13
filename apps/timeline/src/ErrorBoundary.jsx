import { Component } from 'react'

/**
 * Without this, any uncaught render error in a demo produces a blank white
 * page, which is the least useful failure mode for something a reviewer is
 * about to click through. This shows what broke, and the stack, in place.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept as a console error rather than swallowed: the point is to surface it.
    console.error('[demo] render error', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid h-full place-items-center bg-ink-950 p-6">
        <div className="w-full max-w-lg rounded-[10px] border border-red-500/25 bg-red-500/[0.06] p-4">
          <h1 className="text-[13px] font-semibold text-red-200">This demo hit a render error</h1>
          <p className="mt-1.5 font-mono text-[11px] break-words text-red-300/90">
            {error.message || String(error)}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-3 rounded-[6px] border border-white/[0.1] bg-white/[0.05] px-2.5 py-1 text-[11px] text-ink-200 transition-colors duration-150 hover:bg-white/[0.1]"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
