const express = require('express');
const mongoose = require('mongoose');
const midtransClient = require('midtrans-client');
const path = require('path');

const app = express();

// Konfigurasi agar Express bisa membaca JSON dan file HTML statis
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Koneksi ke MongoDB Atlas (diambil dari Environment Variable Vercel)
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Berhasil terhubung ke MongoDB Atlas");
}).catch(err => {
    console.error("Koneksi MongoDB gagal:", err);
});

// Schema Database Finalis
const finalisSchema = new mongoose.Schema({
    nama: { type: String, required: true },
    nomor: { type: String, required: true },
    kategori: { type: String, enum: ['bujang', 'gadis'], required: true },
    foto: { type: String, required: true },
    vote: { type: Number, default: 0 }
});
const Finalis = mongoose.model('Finalis', finalisSchema);

// Schema Database Riwayat Transaksi
const transaksiSchema = new mongoose.Schema({
    order_id: { type: String, required: true, unique: true },
    id_finalis: { type: mongoose.Schema.Types.ObjectId, ref: 'Finalis' },
    nama_voter: String,
    jumlah_vote: Number,
    gross_amount: Number,
    status: { type: String, default: 'pending' },
    tanggal: { type: Date, default: Date.now }
});
const Transaksi = mongoose.model('Transaksi', transaksiSchema);

// Inisialisasi Midtrans Snap (MODE SANDBOX / UJI COBA)
let snap = new midtransClient.Snap({
    isProduction: false, // WAJIB FALSE UNTUK SANDBOX
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ==========================================
// API UNTUK DATA FINALIS
// ==========================================

// API: Ambil Data Finalis (Digunakan di halaman voting & admin)
app.get('/api/finalis', async (req, res) => {
    try {
        const { kategori } = req.query;
        let query = kategori ? { kategori } : {};
        const data = await Finalis.find(query).sort({ nomor: 1 }); // Diurutkan berdasarkan nomor
        
        const formattedData = data.map(item => ({
            id: item._id, 
            nama: item.nama, 
            nomor: item.nomor, 
            kategori: item.kategori, 
            foto: item.foto, 
            vote: item.vote
        }));
        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data finalis' });
    }
});

// API: Buat Data Finalis Baru (Untuk Admin)
app.post('/api/finalis', async (req, res) => {
    try {
        const { nama, nomor, kategori, foto } = req.body;
        const newFinalis = await Finalis.create({ nama, nomor, kategori, foto });
        res.json(newFinalis);
    } catch (error) {
        res.status(500).json({ error: 'Gagal menambah finalis' });
    }
});

// API: Hapus Data Finalis (Untuk Admin)
app.delete('/api/finalis/:id', async (req, res) => {
    try {
        await Finalis.findByIdAndDelete(req.params.id);
        res.json({ message: 'Finalis berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus finalis' });
    }
});

// ==========================================
// API UNTUK TRANSAKSI MIDTRANS
// ==========================================

// API: Membuat Transaksi Pembayaran Vote
app.post('/api/bayar-vote', async (req, res) => {
    try {
        const { id_finalis, jumlah_vote, nama_voter } = req.body;
        const finalis = await Finalis.findById(id_finalis);
        
        if (!finalis) {
            return res.status(404).json({ error: 'Finalis tidak ditemukan' });
        }

        const hargaPerVote = 5000;
        const totalHarga = jumlah_vote * hargaPerVote;

        // Membersihkan ID Order untuk standar Midtrans (menghindari error karakter spesial)
        const rawOrderId = `VOTE-${id_finalis}-${Date.now()}`;
        const cleanOrderId = rawOrderId.replace(/[^a-zA-Z0-9\-_.~]/g, '_');

        const parameter = {
            transaction_details: { 
                order_id: cleanOrderId, 
                gross_amount: totalHarga 
            },
            customer_details: { 
                first_name: nama_voter || 'Pendukung' 
            },
            item_details: [{
                id: finalis._id.toString(), 
                price: hargaPerVote, 
                quantity: jumlah_vote, 
                name: `Vote ${finalis.nama} (${jumlah_vote}x)`
            }]
        };

        // Simpan transaksi pending ke database
        await Transaksi.create({
            order_id: cleanOrderId, 
            id_finalis: finalis._id,
            nama_voter: nama_voter || 'Pendukung', 
            jumlah_vote: parseInt(jumlah_vote),
            gross_amount: totalHarga, 
            status: 'pending'
        });

        // Request token ke server Midtrans
        const transaction = await snap.createTransaction(parameter);
        res.json({ token: transaction.token, order_id: cleanOrderId });
        
    } catch (error) {
        console.error('Midtrans Error:', error);
        res.status(500).json({ error: 'Gagal membuat transaksi pembayaran' });
    }
});

// API: Webhook Notifikasi dari Midtrans (Otomatis menambah vote jika sukses)
app.post('/api/midtrans-notification', async (req, res) => {
    try {
        const notificationStatus = await snap.transaction.notification(req.body);
        const { order_id, transaction_status, fraud_status } = notificationStatus;

        const transaksi = await Transaksi.findOne({ order_id: order_id });
        if (!transaksi) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
        }

        // Cek status pembayaran
        if (transaction_status == 'capture' && fraud_status == 'accept' || transaction_status == 'settlement') {
            transaksi.status = 'success';
            // Tambahkan jumlah vote ke finalis terkait
            await Finalis.findByIdAndUpdate(transaksi.id_finalis, { 
                $inc: { vote: transaksi.jumlah_vote } 
            });
        } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
            transaksi.status = 'failed';
        }

        // Simpan pembaruan status transaksi
        await transaksi.save();
        res.status(200).json({ status: 'OK' });
        
    } catch (error) {
        console.error('Notification error:', error);
        res.status(500).json({ error: 'Notifikasi gagal diproses' });
    }
});

// Menjalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));