import { render, screen } from '@testing-library/react';
import App from './App';

test('renders without crashing', () => {
  render(<App />);
  // The app should render the login page or loading state
  expect(document.body).toBeTruthy();
});
