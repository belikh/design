import { Component, type ReactNode } from "react";
import { EmptyState, Btn } from "./kit.tsx";

/** Catches render errors so one broken view never blanks the whole app shell. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; key?: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };
  static getDerivedStateFromError(error: Error) { return { error }; }
  static getDerivedStateFromProps(p: { resetKey?: string }, s: { key?: string; error: Error | null }) { return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null; }
  render() {
    if (!this.state.error) return this.props.children;
    return <EmptyState spot="unplugged" title="This view crashed" action={<Btn variant="primary" onClick={() => this.setState({ error: null })}>Try again</Btn>}><code>{this.state.error.message}</code></EmptyState>;
  }
}
