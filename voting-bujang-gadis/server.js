const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =========================================================================
// MASUKKAN LINK MONGODB ATLAS ANDA DI BAWAH INI (Di dalam tanda kutip "")
// =========================================================================
const MONGODB_URI = "mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/?appName=Cluster0"; 

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Terkoneksi ke MongoDB Atlas'))
    .catch(err => console.error('Gagal koneksi ke MongoDB:', err));

// Skema Database (Format Data Finalis)
const finalisSchema = new mongoose.Schema({
    nomor: String,
    nama: String,
    kategori: String,
    foto: String,
    vote: { type: Number, default: 0 }
});

const Finalis = mongoose.model('Finalis', finalisSchema);

// =========================================================================
// ROUTING API
// =========================================================================

// 1. Tampilkan semua data finalis (GET)
app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data" });
    }
});

// 2. Tambah finalis baru beserta link foto (POST)
app.post('/api/finalis', async (req, res) => {
    try {
        const finalisBaru = new Finalis({
            nomor: req.body.nomor,
            nama: req.body.nama,
            kategori: req.body.kategori,
            foto: req.body.foto,
            vote: 0
        });
        const simpan = await finalisBaru.save();
        res.status(201).json(simpan);
    } catch (error) {
        res.status(500).json({ message: "Gagal menyimpan data finalis" });
    }
});

// 3. Hapus finalis berdasarkan ID (DELETE) - Fitur Baru!
app.delete('/api/finalis/:id', async (req, res) => {
    try {
        const deletedFinalis = await Finalis.findByIdAndDelete(req.params.id);
        if (!deletedFinalis) {
            return res.status(404).json({ message: "Finalis tidak ditemukan" });
        }
        res.status(200).json({ message: "Finalis berhasil dihapus" });
    } catch (error) {
        console.error("Gagal menghapus:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat menghapus data" });
    }
});
// Fitur Darurat: Reset / Hapus Semua Data
app.delete('/api/reset', async (req, res) => {
    try {
        await Finalis.deleteMany({});
        res.status(200).json({ message: "Database kembali bersih!" });
    } catch (error) {
        res.status(500).json({ message: "Gagal reset data" });
    }
});

// =========================================================================
// Ekspor module untuk Vercel Serverless Function
// =========================================================================
module.exports = app;