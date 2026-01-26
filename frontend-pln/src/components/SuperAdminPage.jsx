import React, { useState } from "react";
import { toast } from "sonner";

const SuperAdminPage = ({ session }) => {
  const [form, setForm] = useState({ nama_trafo: "", lokasi_gi: "", merk: "" });

  const handleAddTrafo = async () => {
    const response = await fetch("http://127.0.0.1:8000/assets/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        user_email: session.user.email, // Kirim email super admin
      }),
    });

    const result = await response.json();
    if (result.status === "Sukses") {
      toast.success("Aset berhasil ditambahkan!");
    } else {
      toast.error(result.msg);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">
        Super Admin Control: Tambah Aset
      </h2>
      <div className="space-y-3">
        <input
          placeholder="Nama GI"
          className="border p-2 w-full rounded"
          onChange={(e) => setForm({ ...form, lokasi_gi: e.target.value })}
        />
        <input
          placeholder="Nama Trafo"
          className="border p-2 w-full rounded"
          onChange={(e) => setForm({ ...form, nama_trafo: e.target.value })}
        />
        <input
          placeholder="Merk"
          className="border p-2 w-full rounded"
          onChange={(e) => setForm({ ...form, merk: e.target.value })}
        />
        <button
          onClick={handleAddTrafo}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Simpan Aset
        </button>
      </div>
    </div>
  );
};

export default SuperAdminPage;
