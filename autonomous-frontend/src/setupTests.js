// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Mock WebGL/XR modules that cannot run in JSDOM
jest.mock('./Hologram3DXR', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockARHologramViewer() {
      return React.createElement('div', { 'data-testid': 'mock-ar-viewer' });
    },
  };
});

jest.mock('./Hologram3D', () => {
  const React = require('react');
  return {
    __esModule: true,
    Hologram3DCanvas: function MockHologram3DCanvas() {
      return React.createElement('div', { 'data-testid': 'mock-hologram' });
    },
  };
});

jest.mock('./HologramSwarm', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockHologramSwarm() {
      return React.createElement('div', { 'data-testid': 'mock-swarm' });
    },
  };
});

jest.mock('./AutonomousGraph', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockAutonomousGraph() {
      return React.createElement('div', { 'data-testid': 'mock-graph' });
    },
  };
});

jest.mock('./QuantumWarfare', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockQuantumWarfare() {
      return React.createElement('div', { 'data-testid': 'mock-quantum' });
    },
  };
});

jest.mock('./PortalNetwork', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockPortalNetwork() {
      return React.createElement('div', { 'data-testid': 'mock-portals' });
    },
  };
});
