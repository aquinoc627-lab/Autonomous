import React, { Component } from 'react';
export class GlobalErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <div className="p-20 text-white">System Fault.</div> : this.props.children; }
}
