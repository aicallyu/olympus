import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';

// Mock the API calls
const mockStats = {
  tasksTotal: 24,
  tasksCompleted: 18,
  tasksInProgress: 4,
  tasksBlocked: 2,
  agentsActive: 7,
  agentsIdle: 0,
};

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(({ queryKey }) => {
      if (queryKey[0] === 'stats') {
        return { data: mockStats, isLoading: false };
      }
      return { data: null, isLoading: false };
    }),
  };
});

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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard title', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 2 })).toBeInTheDocument();
  });

  it('should render subtitle', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Overview of your AI squad')).toBeInTheDocument();
  });

  it('should render all stat cards', () => {
    renderWithProviders(<Dashboard />);
    
    // Use getAllByText for text that appears multiple times (in stat cards and progress bars)
    expect(screen.getByText('Tasks Completed')).toBeInTheDocument();
    expect(screen.getByText('Active Agents')).toBeInTheDocument();
    
    // "In Progress" and "Blocked" appear in both stat card and progress bar
    const inProgressElements = screen.getAllByText('In Progress');
    expect(inProgressElements.length).toBeGreaterThanOrEqual(1);
    
    const blockedElements = screen.getAllByText('Blocked');
    expect(blockedElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display correct stat values from mock data', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('18')).toBeInTheDocument(); // Tasks Completed
    expect(screen.getByText('4')).toBeInTheDocument();  // In Progress
    expect(screen.getByText('2')).toBeInTheDocument();  // Blocked
    expect(screen.getByText('7')).toBeInTheDocument();  // Active Agents
  });

  it('should render Task Distribution section', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByRole('heading', { name: /Task Distribution/i })).toBeInTheDocument();
    
    // Check for progress bar labels using within to scope the search
    const taskDistributionSection = screen.getByRole('heading', { name: /Task Distribution/i }).closest('.card');
    if (taskDistributionSection) {
      const { getByText } = within(taskDistributionSection as HTMLElement);
      expect(getByText('Completed')).toBeInTheDocument();
      expect(getByText('Blocked')).toBeInTheDocument();
    }
  });

  it('should render Recent Activity section', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByRole('heading', { name: /Recent Activity/i })).toBeInTheDocument();
  });

  it('should display recent activity items', () => {
    renderWithProviders(<Dashboard />);
    
    // Check for activity items from mock data
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText('ATHENA')).toBeInTheDocument();
    expect(screen.getByText('HERCULOS')).toBeInTheDocument();
    expect(screen.getByText('ARGOS')).toBeInTheDocument();
  });

  it('should display activity actions', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('completed task')).toBeInTheDocument();
    expect(screen.getByText('started review')).toBeInTheDocument();
    expect(screen.getByText('created task')).toBeInTheDocument();
    expect(screen.getByText('assigned task')).toBeInTheDocument();
  });

  it('should display activity targets', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('LoginForm component')).toBeInTheDocument();
    expect(screen.getByText('API endpoints')).toBeInTheDocument();
    expect(screen.getByText('Database schema')).toBeInTheDocument();
    expect(screen.getByText('Dashboard UI')).toBeInTheDocument();
  });

  it('should display time indicators', () => {
    renderWithProviders(<Dashboard />);
    
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
    expect(screen.getByText('12 min ago')).toBeInTheDocument();
    expect(screen.getByText('15 min ago')).toBeInTheDocument();
  });

  it('should render progress bars', () => {
    renderWithProviders(<Dashboard />);
    
    // Progress bars should have percentage labels
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('17%')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
  });

  it('should render icons in stat cards', () => {
    const { container } = renderWithProviders(<Dashboard />);
    
    // Check for SVG icons (lucide-react icons are SVGs)
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('should display trend indicator on Tasks Completed card', () => {
    renderWithProviders(<Dashboard />);
    
    // Find the Tasks Completed card and check for trend within it
    const tasksCompletedCard = screen.getByText('Tasks Completed').closest('.card');
    if (tasksCompletedCard) {
      const { getByText } = within(tasksCompletedCard as HTMLElement);
      expect(getByText(/\+12%/)).toBeInTheDocument();
      expect(getByText(/from last week/)).toBeInTheDocument();
    }
  });

  it('should have proper card styling', () => {
    const { container } = renderWithProviders(<Dashboard />);
    
    // Dashboard should have a container
    expect(container.firstChild).toHaveClass('space-y-6');
  });

  it('should render agent emojis', () => {
    renderWithProviders(<Dashboard />);
    
    // Check for specific agent emojis (these are rendered as text)
    expect(screen.getByText('🏛️')).toBeInTheDocument(); // ATLAS
    expect(screen.getByText('🦉')).toBeInTheDocument(); // ATHENA
    expect(screen.getByText('⚙️')).toBeInTheDocument(); // HERCULOS
    expect(screen.getByText('🔱')).toBeInTheDocument(); // ARGOS
  });
});
