const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const midtransClient = require('midtrans-client');

const app = express();

// ==========================================
// 1. MIDDLEWARE 
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); 

// ==========================================
// 2. KONEKSI MONGODB ATLAS (LINK LANGSUNG)
// ==========================================
const mongoURI = 'mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/votingDB?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
    .then(() => console.log('Berhasil terhubung ke MongoDB Atlas'))
    .catch(err => console.error('Koneksi MongoDB gagal:', err));

// Skema Database Finalis (Disesuaikan dengan admin.html)
const finalisSchema = new mongoose.Schema({
    nomor: { type: String, required: true },
    nama: { type: String, required: true },
    kategori: { type: String, required: true }, 
    foto: { type: String, required: true },
    vote: { type: Number, default: 0 }
});
const Finalis = mongoose.model('Finalis', finalisSchema);

// Skema Database Transaksi
const transaksiSchema = new mongoose.Schema({
    orderId: String,
    status: String,
    jumlahBayar: Number
});
const Transaksi = mongoose.model('Transaksi', transaksiSchema);

// ==========================================
// 3. KONFIGURASI MIDTRANS
// ==========================================
const coreApi = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ==========================================
// 4. ROUTES API
// ==========================================

// Tampil data finalis
app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find().sort({ nomor: 1 });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data finalis' });
    }
});

// Tambah data finalis
app.post('/api/finalis', async (req, res) => {
    try {
        const { nomor, nama, kategori, foto } = req.body;
        const finalisBaru = new Finalis({ nomor, nama, kategori, foto });
        await finalisBaru.save();
        res.status(201).json({ message: 'Finalis berhasil ditambahkan!', data: finalisBaru });
    } catch (error) {
        console.error('Error tambah finalis:', error);
        res.status(500).json({ error: 'Gagal menyimpan data finalis ke database' });
    }
});

// Hapus data finalis
app.delete('/api/finalis/:id', async (req, res) => {
    try {
        await Finalis.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Finalis berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus finalis' });
    }
});

// Notifikasi pembayaran Midtrans
app.post('/api/notification', async (req, res) => {
    try {
        const notificationJson = req.body;
        const statusResponse = await coreApi.transaction.notification(notificationJson);
        
        let orderId = statusResponse.order_id;
        let transactionStatus = statusResponse.transaction_status;

        const transaksi = await Transaksi.findOne({ orderId: orderId });
        if (transaksi) {
            transaksi.status = transactionStatus;
            await transaksi.save(); 
        }
        res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ error: 'Notifikasi gagal diproses' });
    }
});

// ==========================================
// 5. SERVER & EXPORT VERCEL
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));

module.exports = app;