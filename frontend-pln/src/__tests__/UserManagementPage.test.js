/**
 * WHITE BOX TEST untuk UserManagementPage.jsx
 * Menguji user management logic, CRUD operations, dan error handling
 */

import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import UserManagementPage from "../components/UserManagementPage";

// Mock dependencies
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      signUp: jest.fn(),
    },
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

describe("UserManagementPage - White Box Testing", () => {
  const mockSession = { user: { id: "123", email: "admin@example.com" } };
  const mockUsers = [
    {
      id: "1",
      email: "user1@example.com",
      role: "admin_unit",
      unit_ultg: "Unit A",
    },
    {
      id: "2",
      email: "user2@example.com",
      role: "operator",
      unit_ultg: "Unit B",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementation for fetching users
    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockUsers,
      error: null,
    });

    supabase.from.mockReturnValue({
      select: mockSelect,
      order: mockOrder,
      insert: jest.fn().mockResolvedValue({ error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  // ============================================
  // TEST: Component Initialization
  // ============================================
  describe("Component Initialization", () => {
    test("harus render UserManagementPage tanpa crash", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      expect(screen.getByText(/Manajemen Pengguna/i)).toBeInTheDocument();
    });

    test("harus fetch users saat component mount", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });
  });

  // ============================================
  // TEST: Fetch Users Logic
  // ============================================
  describe("Fetch Users", () => {
    test("harus display users dalam list", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      await waitFor(() => {
        expect(screen.getByText("user1@example.com")).toBeInTheDocument();
        expect(screen.getByText("user2@example.com")).toBeInTheDocument();
      });
    });

    test("harus handle fetch error dengan toast", async () => {
      // Override mock implementation for error case
      const mockOrderError = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Fetch failed" },
      });

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: mockOrderError,
      });

      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Fetch failed"),
        );
      });
    });
  });

  // ============================================
  // TEST: User Creation
  // ============================================
  describe("User Creation Flow", () => {
    test("harus bisa membuka modal tambah user", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      const addBtn = screen.getByText(/Tambah User & Unit/i);
      fireEvent.click(addBtn);

      expect(screen.getByText("Registrasi User & Unit")).toBeInTheDocument();
    });

    test("harus membuka modal saat tombol tambah user di-klik", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      const tambahBtn = screen.getByText(/Tambah User & Unit/i);
      expect(tambahBtn).toBeInTheDocument();

      // Klik tombol untuk buka modal
      fireEvent.click(tambahBtn);

      // Check if save button exists (tombol hanya ada di dalam modal)
      await waitFor(() => {
        expect(screen.getByText(/Simpan User & Unit/i)).toBeInTheDocument();
      });
    });

    test("harus berhasil membuat user baru (Happy Path)", async () => {
      // Mock signup success
      supabase.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: "new-123" } },
        error: null,
      });

      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      // 1. Buka Modal
      fireEvent.click(screen.getByText(/Tambah User & Unit/i));

      // 2. Isi Form
      const emailInput = screen.getByPlaceholderText("manager@pln.co.id");
      const passInput = screen.getByPlaceholderText("••••••••");
      const unitInput = screen.getByPlaceholderText("CONTOH: ULTG LOPANA");

      await userEvent.type(emailInput, "newmanager@pln.co.id");
      await userEvent.type(passInput, "password123");
      await userEvent.type(unitInput, "ULTG TEST");

      // 3. Submit
      const saveBtn = screen.getByText(/Simpan User & Unit/i);

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      // 4. Assertions
      await waitFor(() => {
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: "newmanager@pln.co.id",
          password: "password123",
        });

        // Cek insert profile
        expect(supabase.from).toHaveBeenCalledWith("profiles");

        // Cek insert unit
        expect(supabase.from).toHaveBeenCalledWith("master_ultg");

        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // TEST: Role Logic
  // ============================================
  describe("Role Based Logic", () => {
    test("input unit harus disabled jika role super_admin", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      fireEvent.click(screen.getByText(/Tambah User & Unit/i));

      // Ganti role ke super_admin
      const roleSelect = screen.getAllByRole("combobox")[0]; // Asumsi role select adalah combobox pertama
      fireEvent.change(roleSelect, { target: { value: "super_admin" } });

      const unitInput = screen.getByPlaceholderText("CONTOH: ULTG LOPANA");
      expect(unitInput).toBeDisabled();
    });

    test("input unit harus enabled jika role admin_unit", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      fireEvent.click(screen.getByText(/Tambah User & Unit/i));

      // Default role biasanya admin_unit
      const unitInput = screen.getByPlaceholderText("CONTOH: ULTG LOPANA");
      expect(unitInput).not.toBeDisabled();
    });
  });

  // ============================================
  // TEST: User Deletion
  // ============================================
  describe("User Deletion", () => {
    test("harus memanggil API delete saat tombol hapus diklik", async () => {
      // Mock fetch global
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ status: "Sukses" }),
        }),
      );

      // Mock confirm dialog
      window.confirm = jest.fn(() => true);

      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      // Cari tombol hapus (biasanya icon Trash, kita cari by role button di baris user)
      // Kita pakai user1 yang bukan user current session
      const deleteButtons = screen.getAllByTitle("Hapus User");

      if (deleteButtons.length > 0) {
        await act(async () => {
          fireEvent.click(deleteButtons[0]);
        });

        expect(window.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/admin/delete-user/"),
          expect.objectContaining({ method: "DELETE" }),
        );
      }
    });
  });
});
