const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware dinaikkan batasnya menjadi 10MB agar kuat menampung file gambar
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Link Database Anda
const MONGODB_URI = "mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/voting_db?appName=Cluster0"; 

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Terkoneksi ke MongoDB'))
    .catch(err => console.error('Gagal koneksi:', err));

const finalisSchema = new mongoose.Schema({
    nomor: String,
    nama: String,
    kategori: String,
    foto: String, 
    vote: { type: Number, default: 0 }
});

const Finalis = mongoose.model('Finalis', finalisSchema);

app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: "Error server" });
    }
});

app.post('/api/finalis', async (req, res) => {
    try {
        const finalisBaru = new Finalis(req.body);
        const simpan = await finalisBaru.save();
        res.status(201).json(simpan);
    } catch (error) {
        res.status(500).json({ message: "Error simpan" });
    }
});

app.delete('/api/finalis/:id', async (req, res) => {
    try {
        if (mongoose.Types.ObjectId.isValid(req.params.id)) {
            await Finalis.findByIdAndDelete(req.params.id);
        }
        res.status(200).json({ message: "Terhapus" });
    } catch (error) {
        res.status(500).json({ message: "Error hapus" });
    }
});

app.delete('/api/reset', async (req, res) => {
    try {
        await Finalis.deleteMany({});
        res.status(200).json({ message: "Database Bersih" });
    } catch (error) {
        res.status(500).json({ message: "Error reset" });
    }
});

module.exports = app;