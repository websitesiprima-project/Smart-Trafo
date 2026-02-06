// 1. POLYFILL
import { TextEncoder, TextDecoder } from "util";
Object.assign(global, { TextEncoder, TextDecoder });

import React from "react";
import { render, screen } from "@testing-library/react";
import { act } from "react";

// Import Komponen
import TrendChart from "../components/TrendChart";
import DuvalPentagon from "../components/DuvalPentagon";
import DuvalTriangle from "../components/DuvalTriangle";
import GIMap from "../components/GIMap";
import MapWrapper from "../components/MapWrapper";

// --- MOCKS ---

// Mock Recharts menggunakan require internal
jest.mock("recharts", () => {
  const React = require("react");
  return {
    ResponsiveContainer: ({ children }) =>
      React.createElement(
        "div",
        { "data-testid": "chart-container" },
        children,
      ),
    LineChart: ({ children }) => React.createElement("div", null, children),
    AreaChart: ({ children }) => React.createElement("div", null, children),
    ComposedChart: ({ children }) => React.createElement("div", null, children),
    PieChart: ({ children }) => React.createElement("div", null, children),
    XAxis: () => React.createElement("div", null, "XAxis"),
    YAxis: () => React.createElement("div", null, "YAxis"),
    CartesianGrid: () => React.createElement("div", null, "Grid"),
    Tooltip: () => React.createElement("div", null, "Tooltip"),
    Legend: () => React.createElement("div", null, "Legend"),
    Line: () => React.createElement("div", null, "Line"),
    Area: () => React.createElement("div", null, "Area"),
    Bar: () => React.createElement("div", null, "Bar"),
    Cell: () => React.createElement("div", null, "Cell"),
    Pie: () => React.createElement("div", null, "Pie"),
  };
});

// Mock Leaflet menggunakan require internal
jest.mock("react-leaflet", () => {
  const React = require("react");
  return {
    MapContainer: ({ children }) =>
      React.createElement("div", { "data-testid": "map-container" }, children),
    TileLayer: () => React.createElement("div"),
    Marker: ({ children }) =>
      React.createElement("div", { "data-testid": "marker" }, children),
    Popup: ({ children }) =>
      React.createElement("div", { "data-testid": "popup" }, children),
  };
});

describe("Visualization Components", () => {
  test("TrendChart renders without crashing", async () => {
    const dummyData = [{ tanggal_sampling: "2024-01-01", h2: 10, ch4: 20 }];
    await act(async () => {
      render(<TrendChart data={dummyData} />);
    });
    expect(screen.getByTestId("chart-container")).toBeInTheDocument();
  });

  test("DuvalPentagon renders", async () => {
    const gasData = { h2: 10, ch4: 10, c2h6: 10, c2h4: 10, c2h2: 10 };
    await act(async () => {
      render(<DuvalPentagon data={gasData} />);
    });
    expect(document.body).toBeInTheDocument();
  });

  test("DuvalTriangle renders", async () => {
    const gasData = { ch4: 10, c2h4: 10, c2h2: 10 };
    await act(async () => {
      render(<DuvalTriangle data={gasData} />);
    });
    expect(document.body).toBeInTheDocument();
  });

  test("GIMap renders map container", async () => {
    const dummyData = [{ name: "GI Test", lat: 0, lon: 0 }];
    await act(async () => {
      render(<GIMap data={dummyData} />);
    });
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  test("MapWrapper renders children", async () => {
    const mockProps = { center: [0, 0], zoom: 10 };
    await act(async () => {
      render(
        <MapWrapper {...mockProps}>
          <div data-testid="child-map">Child</div>
        </MapWrapper>,
      );
    });
    expect(screen.getByTestId("child-map")).toBeInTheDocument();
  });
});
