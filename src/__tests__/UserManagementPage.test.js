/**
 * WHITE BOX TEST untuk UserManagementPage.jsx
 * Menguji logic Create User, Role, dan Secure Delete (Modal Konfirmasi)
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react"; // ✅ FIX: Pastikan act diimpor dari 'react'
import { supabase } from "../lib/supabaseClient";
import { toast } from "sonner";
import UserManagementPage from "../components/UserManagementPage";

// --- MOCKING ---
jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
    auth: { signUp: jest.fn() },
  },
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

// Mock Global Fetch untuk API Backend Python
global.fetch = jest.fn();

describe("UserManagementPage - White Box Testing", () => {
  const mockSession = { user: { id: "123", email: "admin@pln.co.id" } };

  const mockUsers = [
    {
      id: "u1",
      email: "manager@pln.co.id",
      role: "admin_unit",
      unit_ultg: "ULTG LOPANA",
    },
    {
      id: "u2",
      email: "staff@pln.co.id",
      role: "operator",
      unit_ultg: "ULTG TONDANO",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Supabase Response (Fetch Users)
    const mockSelect = jest.fn().mockReturnThis();
    const mockOrder = jest.fn().mockResolvedValue({
      data: mockUsers,
      error: null,
    });

    supabase.from.mockReturnValue({
      select: mockSelect,
      order: mockOrder,
    });

    // Mock Fetch Default Response
    global.fetch.mockResolvedValue({
      json: () => Promise.resolve({ status: "Sukses", msg: "Berhasil" }),
    });
  });

  // ============================================
  // TEST 1: RENDER & FETCH DATA
  // ============================================
  test("harus me-render tabel user dengan data yang benar", async () => {
    await act(async () => {
      render(<UserManagementPage session={mockSession} isDarkMode={true} />);
    });

    expect(
      screen.getByText("Manajemen Pengguna & Wilayah"),
    ).toBeInTheDocument();
    expect(screen.getByText("manager@pln.co.id")).toBeInTheDocument();
    expect(screen.getByText("ULTG LOPANA")).toBeInTheDocument();
  });

  // ============================================
  // TEST 2: CREATE USER VALIDATION
  // ============================================
  test("harus validasi email domain @pln.co.id", async () => {
    await act(async () => {
      render(<UserManagementPage session={mockSession} isDarkMode={true} />);
    });

    // 1. Buka Modal
    fireEvent.click(screen.getByText(/Tambah User & Unit/i));

    // 2. Isi Email Salah
    const emailInput = screen.getByPlaceholderText("manager@pln.co.id");
    await userEvent.type(emailInput, "hacker@gmail.com");

    // Isi Password Dummy agar lolos validasi HTML 'required'
    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await userEvent.type(passwordInputs[0], "pass123");
    await userEvent.type(passwordInputs[1], "pass123");

    // 3. Submit
    const saveBtn = screen.getByText(/Simpan User & Unit/i);
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // 4. Cek Error Toast
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("domain @pln.co.id"),
    );
  });

  // ============================================
  // TEST 3: CREATE USER SUCCESS
  // ============================================
  test("harus memanggil API create-user saat data valid", async () => {
    await act(async () => {
      render(<UserManagementPage session={mockSession} isDarkMode={true} />);
    });

    fireEvent.click(screen.getByText(/Tambah User & Unit/i));

    // Isi Form Lengkap
    await userEvent.type(
      screen.getByPlaceholderText("manager@pln.co.id"),
      "new@pln.co.id",
    );

    const passwordInputs = screen.getAllByPlaceholderText("••••••••");
    await userEvent.type(passwordInputs[0], "pass123");
    await userEvent.type(passwordInputs[1], "pass123");

    await userEvent.type(
      screen.getByPlaceholderText("CONTOH: Lopana"),
      "ULTG BARU",
    );

    // Submit
    await act(async () => {
      fireEvent.click(screen.getByText(/Simpan User & Unit/i));
    });

    // Verifikasi API Call
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/admin/create-user"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("new@pln.co.id"),
      }),
    );
    expect(toast.success).toHaveBeenCalled();
  });

  // ============================================
  // TEST 4: SECURE DELETE FLOW
  // ============================================
  describe("Secure Delete Flow", () => {
    test("harus membuka modal konfirmasi saat tombol hapus diklik", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      const deleteBtns = screen.getAllByTitle("Hapus User");
      fireEvent.click(deleteBtns[0]);

      expect(screen.getByText("Konfirmasi Hapus User")).toBeInTheDocument();
      expect(screen.getByText("HAPUS ULTG LOPANA")).toBeInTheDocument();
    });

    test("tombol hapus permanen harus disabled jika teks konfirmasi salah", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      fireEvent.click(screen.getAllByTitle("Hapus User")[0]);

      const confirmInput = screen.getByPlaceholderText("HAPUS ULTG LOPANA");
      await userEvent.type(confirmInput, "SALAH TEKS");

      const deleteBtn = screen.getByText("Hapus Permanen");
      expect(deleteBtn).toBeDisabled();
    });

    test("harus melakukan penghapusan jika teks konfirmasi benar", async () => {
      await act(async () => {
        render(<UserManagementPage session={mockSession} isDarkMode={true} />);
      });

      fireEvent.click(screen.getAllByTitle("Hapus User")[0]);

      // Ketik teks BENAR
      const confirmInput = screen.getByPlaceholderText("HAPUS ULTG LOPANA");
      await userEvent.type(confirmInput, "HAPUS ULTG LOPANA");

      const deleteBtn = screen.getByText("Hapus Permanen");
      expect(deleteBtn).not.toBeDisabled();

      // Klik Hapus
      await act(async () => {
        fireEvent.click(deleteBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/admin/delete-user/u1"),
        expect.objectContaining({ method: "DELETE" }),
      );

      expect(toast.success).toHaveBeenCalled();
    });
  });
});
