const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const midtransClient = require('midtrans-client');

const app = express();

// ==========================================
// 1. MIDDLEWARE (Wajib agar Vercel & HTML terhubung)
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Membaca file HTML statis agar tidak error 404
app.use(express.static(path.join(__dirname))); 

// ==========================================
// 2. KONEKSI MONGODB ATLAS
// ==========================================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Berhasil terhubung ke MongoDB Atlas'))
    .catch(err => console.error('Koneksi MongoDB gagal:', err));

// Skema Database Finalis
const finalisSchema = new mongoose.Schema({
    nomorUrut: { type: Number, required: true },
    nama: { type: String, required: true },
    kategori: { type: String, required: true }, // 'Bujang' atau 'Gadis'
    jumlahVote: { type: Number, default: 0 }
});
const Finalis = mongoose.model('Finalis', finalisSchema);

// Skema Database Transaksi (Untuk Midtrans)
const transaksiSchema = new mongoose.Schema({
    orderId: String,
    status: String,
    jumlahBayar: Number
});
const Transaksi = mongoose.model('Transaksi', transaksiSchema);

// ==========================================
// 3. KONFIGURASI MIDTRANS (Mode Sandbox)
// ==========================================
const coreApi = new midtransClient.CoreApi({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ==========================================
// 4. ROUTES API (Jalur komunikasi data)
// ==========================================

// Mengambil semua data finalis untuk ditampilkan di halaman vote
app.get('/api/finalis', async (req, res) => {
    try {
        const data = await Finalis.find().sort({ nomorUrut: 1 });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data finalis' });
    }
});

// Menambahkan finalis baru (Digunakan di admin.html)
app.post('/api/finalis', async (req, res) => {
    try {
        const { nomorUrut, nama, kategori } = req.body;
        const finalisBaru = new Finalis({ nomorUrut, nama, kategori });
        await finalisBaru.save();
        res.status(201).json({ message: 'Finalis berhasil ditambahkan!', data: finalisBaru });
    } catch (error) {
        console.error('Error tambah finalis:', error);
        res.status(500).json({ error: 'Gagal menyimpan data finalis ke database' });
    }
});

// Route Notifikasi Midtrans (Sesuai potongan kode Anda)
app.post('/api/notification', async (req, res) => {
    try {
        const notificationJson = req.body;
        const statusResponse = await coreApi.transaction.notification(notificationJson);
        
        let orderId = statusResponse.order_id;
        let transactionStatus = statusResponse.transaction_status;

        // Cari transaksi di database
        const transaksi = await Transaksi.findOne({ orderId: orderId });
        if (transaksi) {
            transaksi.status = transactionStatus;
            await transaksi.save(); // Menyimpan pembaruan status
        }

        res.status(200).json({ status: 'OK' });
        
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ error: 'Notifikasi gagal diproses' });
    }
});

// ==========================================
// 5. KONFIGURASI SERVER & EXPORT VERCEL
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));

// Baris INI yang membuat aplikasi Anda berfungsi di Vercel (Serverless)
module.exports = app;