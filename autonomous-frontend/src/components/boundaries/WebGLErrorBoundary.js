import React, { Component } from 'react';
export class WebGLErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? <div className="p-20 text-white">WebGL Fault.</div> : this.props.children; }
}
