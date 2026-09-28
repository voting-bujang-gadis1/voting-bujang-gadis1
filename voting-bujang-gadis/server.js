const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// =========================================================================
// Link MongoDB sudah ditambahkan nama database "voting_db" di dalamnya
// =========================================================================
const MONGODB_URI = "mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/voting_db?appName=Cluster0"; 

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Terkoneksi ke MongoDB Atlas (voting_db)'))
    .catch(err => console.error('Gagal koneksi ke MongoDB:', err));

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

app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data" });
    }
});

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

// Fitur Hapus (Dengan Pelindung Anti-Crash)
app.delete('/api/finalis/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // PELINDUNG: Jika ID yang dikirim adalah "undefined" atau tidak valid, abaikan tanpa error
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(200).json({ message: "Data cacat diabaikan / sudah terhapus" });
        }

        await Finalis.findByIdAndDelete(id);
        res.status(200).json({ message: "Finalis berhasil dihapus" });
    } catch (error) {
        console.error("Gagal menghapus:", error);
        res.status(500).json({ message: "Terjadi kesalahan saat menghapus data" });
    }
});

app.delete('/api/reset', async (req, res) => {
    try {
        await Finalis.deleteMany({});
        res.status(200).json({ message: "Database kembali bersih!" });
    } catch (error) {
        res.status(500).json({ message: "Gagal reset data" });
    }
});

module.exports = app;