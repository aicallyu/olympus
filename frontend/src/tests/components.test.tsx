import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import App from '../App';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Layout Component', () => {
  it('should render children content', () => {
    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render sidebar', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
  });

  it('should render header', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    expect(screen.getByPlaceholderText('Search tasks, agents, documents...')).toBeInTheDocument();
  });
});

describe('Sidebar Component', () => {
  it('should render logo and title', () => {
    renderWithProviders(<Sidebar />);
    
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    expect(screen.getByText('ARGOS Squad')).toBeInTheDocument();
  });

  it('should render all navigation items', () => {
    renderWithProviders(<Sidebar />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Task Board')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    renderWithProviders(<Sidebar />);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const tasksLink = screen.getByText('Task Board').closest('a');
    const agentsLink = screen.getByText('Agents').closest('a');
    const activityLink = screen.getByText('Activity').closest('a');
    
    expect(dashboardLink).toHaveAttribute('href', '/');
    expect(tasksLink).toHaveAttribute('href', '/tasks');
    expect(agentsLink).toHaveAttribute('href', '/agents');
    expect(activityLink).toHaveAttribute('href', '/activity');
  });

  it('should render settings button', () => {
    renderWithProviders(<Sidebar />);
    
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight active navigation item', () => {
    renderWithProviders(<Sidebar />);
    
    // The Dashboard should be active when on home route
    const dashboardNav = screen.getByText('Dashboard').closest('a');
    expect(dashboardNav).toHaveClass('bg-primary/10');
  });
});

describe('Header Component', () => {
  it('should render search input', () => {
    renderWithProviders(<Header />);
    
    const searchInput = screen.getByPlaceholderText('Search tasks, agents, documents...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  it('should render notification bell', () => {
    const { container } = renderWithProviders(<Header />);
    
    // Bell icon should be present (lucide-react Bell icon is an SVG)
    const bellSvg = container.querySelector('svg');
    expect(bellSvg).toBeInTheDocument();
  });

  it('should render user info', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('ARGOS')).toBeInTheDocument();
    expect(screen.getByText('Orchestrator')).toBeInTheDocument();
  });

  it('should render notification indicator', () => {
    const { container } = renderWithProviders(<Header />);
    
    // Check for the notification dot (pulse animation indicator)
    const pulseIndicator = container.querySelector('.animate-pulse');
    expect(pulseIndicator).toBeInTheDocument();
  });
});

describe('App Component', () => {
  it('should render with Layout wrapper', () => {
    renderWithProviders(<App />);
    
    // Should have the sidebar
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    
    // Should have the header search
    expect(screen.getByPlaceholderText('Search tasks, agents, documents...')).toBeInTheDocument();
  });

  it('should render Dashboard on home route', () => {
    renderWithProviders(<App />);
    
    // Dashboard appears in sidebar nav and as page title
    // Check for the page title specifically (h2 heading)
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Overview of your AI squad')).toBeInTheDocument();
  });
});

describe('Navigation Flow', () => {
  it('should navigate between routes', async () => {
    renderWithProviders(<App />);
    
    // Start on Dashboard
    expect(screen.getByText('Overview of your AI squad')).toBeInTheDocument();
    
    // Navigation links should be present
    const taskLink = screen.getByText('Task Board');
    expect(taskLink).toBeInTheDocument();
    
    const agentsLink = screen.getByText('Agents');
    expect(agentsLink).toBeInTheDocument();
    
    const activityLink = screen.getByText('Activity');
    expect(activityLink).toBeInTheDocument();
  });
});

describe('Component Integration', () => {
  it('should have consistent styling across components', () => {
    const { container } = renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    
    // Main layout structure
    const mainElement = container.querySelector('main');
    expect(mainElement).toHaveClass('flex-1', 'overflow-auto', 'p-6');
  });

  it('should render icons in sidebar navigation', () => {
    const { container } = renderWithProviders(<Sidebar />);
    
    // Should have SVG icons for each nav item
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(4); // 4 nav items + settings
  });
});
