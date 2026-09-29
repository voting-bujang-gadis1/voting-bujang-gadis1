// Pancingan update Vercel hari ini
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const MONGODB_URI = "mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/voting_db?appName=Cluster0"; 

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Terkoneksi ke MongoDB'))
    .catch(err => console.error('Gagal koneksi:', err));

// SKEMA FINALIS
const finalisSchema = new mongoose.Schema({
    nomor: String, nama: String, kategori: String, foto: String, 
    biodata: String, visiMisi: String, vote: { type: Number, default: 0 }
});
const Finalis = mongoose.model('Finalis', finalisSchema);

// SKEMA PENGATURAN WEB (Logo & Judul)
const pengaturanSchema = new mongoose.Schema({
    judul: { type: String, default: "Bujang Gadis Favorit 2026" },
    subjudul: { type: String, default: "Berikan dukungan terbaikmu untuk calon juara favorit!" },
    logo: { type: String, default: "https://via.placeholder.com/150/0056b3/FFFFFF?text=LOGO" }
});
const Pengaturan = mongoose.model('Pengaturan', pengaturanSchema);

// ================= API PENGATURAN (BARU) =================
app.get('/api/pengaturan', async (req, res) => {
    try {
        let config = await Pengaturan.findOne();
        if (!config) config = await Pengaturan.create({}); 
        res.status(200).json(config);
    } catch (error) { res.status(500).json({ message: "Error server" }); }
});

app.post('/api/pengaturan', async (req, res) => {
    try {
        let config = await Pengaturan.findOne();
        if (config) {
            if (req.body.judul) config.judul = req.body.judul;
            if (req.body.subjudul) config.subjudul = req.body.subjudul;
            if (req.body.logo) config.logo = req.body.logo;
            await config.save();
        } else {
            config = await Pengaturan.create(req.body);
        }
        res.status(200).json(config);
    } catch (error) { res.status(500).json({ message: "Error simpan pengaturan" }); }
});

// ================= API FINALIS (LAMA) =================
app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find();
        res.status(200).json(data);
    } catch (error) { res.status(500).json({ message: "Error server" }); }
});

app.post('/api/finalis', async (req, res) => {
    try {
        const finalisBaru = new Finalis(req.body);
        const simpan = await finalisBaru.save();
        res.status(201).json(simpan);
    } catch (error) { res.status(500).json({ message: "Error simpan" }); }
});

app.delete('/api/finalis/:id', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) await Finalis.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Terhapus" });
    } catch (error) { res.status(500).json({ message: "Error hapus" }); }
});

app.delete('/api/reset', async (req, res) => {
    try {
        await Finalis.deleteMany({});
        res.status(200).json({ message: "Database Bersih" });
    } catch (error) { res.status(500).json({ message: "Error reset" }); }
});

// Penangkap Error 404 untuk jaga-jaga
app.use((req, res) => {
    res.status(404).json({ message: "Rute API tidak ditemukan!" });
});

module.exports = app;