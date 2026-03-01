import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";

// Import Komponen
import SuperAdminPage from "../components/SuperAdminPage";
import TrendingPage from "../components/TrendingPage";
import ExcelImportModal from "../components/ExcelImportModal";
import VoltyAssistant from "../components/VoltyAssistant";
import DashboardPage from "../components/DashboardPage";

// --- GLOBAL MOCKS ---

// 1. Mock Fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: [], status: "Sukses" }),
    ok: true,
  }),
);

// 2. Mock ScrollIntoView (FIX UNTUK VOLTY ASSISTANT)
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// 3. Mock Supabase
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({ error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: "1" } } }),
    },
  },
}));

// 4. Mock Sonner
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), loading: jest.fn() },
}));

// 5. Mock Libraries Berat
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }) => (
    <div data-testid="chart">{children}</div>
  ),
  ComposedChart: () => <div>Chart</div>,
  Line: () => <div />,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  PieChart: () => <div />,
  Pie: () => <div />,
  Cell: () => <div />,
}));

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div />,
  Marker: () => <div />,
  Popup: () => <div />,
}));

// 6. Mock Child Components (Semua yang dipakai Dashboard)
const mockComponent = (name) => {
  const MockedComponent = (props) => (
    <div data-testid={`mock-${name}`}>{name}</div>
  );
  return {
    __esModule: true,
    default: MockedComponent,
    [name]: MockedComponent,
  };
};

jest.mock("../components/TrendChart", () => mockComponent("TrendChart"));
jest.mock("../components/GIMap", () => mockComponent("GIMap"));
jest.mock("../components/DownloadButton", () =>
  mockComponent("DownloadButton"),
);
jest.mock("../components/LoadingScreen", () => mockComponent("LoadingScreen"));

// 7. Mock Google AI
jest.mock(
  "@google/generative-ai",
  () => ({
    GoogleGenerativeAI: jest.fn(() => ({
      getGenerativeModel: jest.fn(() => ({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => "AI Response" },
        }),
      })),
    })),
  }),
  { virtual: true },
);

describe("Advanced Pages Integration", () => {
  const mockSession = { user: { email: "admin@pln.co.id" } };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  // --- DashboardPage ---
  test("DashboardPage renders correctly", async () => {
    await act(async () => {
      render(<DashboardPage session={mockSession} isDarkMode={true} />);
    });

    // Cek elemen dashboard
    const dashboardElement =
      screen.queryByText(/Dashboard/i) ||
      screen.queryByText(/Total Aset/i) ||
      screen.queryByTestId("mock-TrendChart") ||
      screen.queryByTestId("mock-GIMap");

    expect(dashboardElement).toBeInTheDocument();
  });

  // --- SuperAdminPage ---
  test("SuperAdminPage renders table", async () => {
    await act(async () => {
      render(<SuperAdminPage session={mockSession} isDarkMode={true} />);
    });
    const pageTitle =
      screen.queryByText(/Super Admin/i) || screen.queryByText(/Manajemen/i);
    expect(pageTitle).toBeInTheDocument();
  });

  // --- TrendingPage ---
  test("TrendingPage renders inputs", async () => {
    await act(async () => {
      render(<TrendingPage session={mockSession} isDarkMode={true} />);
    });
    expect(screen.getByText(/Analisis Trending/i)).toBeInTheDocument();
  });

  // --- ExcelImportModal ---
  test("ExcelImportModal opens and shows content", async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(<ExcelImportModal isOpen={true} onClose={onClose} />);
    });
    expect(screen.getByText(/Upload File Excel/i)).toBeInTheDocument();

    const closeBtn = screen.getByText(/Batal/i);
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  // --- VoltyAssistant ---
  test("VoltyAssistant opens chat when clicked", async () => {
    const { container } = render(<VoltyAssistant isOpen={false} />);

    // 1. Buka Chat
    const buttons = container.querySelectorAll("button");
    const toggleButton = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.click(toggleButton);
    });

    // 2. Cek Input Muncul
    const input = await screen.findByPlaceholderText(/Tanya Volty/i);
    expect(input).toBeInTheDocument();

    // 3. Test Kirim Pesan
    await act(async () => {
      fireEvent.change(input, { target: { value: "Halo AI" } });
      const sendBtn =
        document.querySelector('button[type="submit"]') ||
        container.querySelector('button[type="submit"]');
      if (sendBtn) {
        fireEvent.click(sendBtn);
      }
    });

    // Expect input clear after send
    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});
