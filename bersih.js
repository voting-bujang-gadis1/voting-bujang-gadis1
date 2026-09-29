const mongoose = require('mongoose');

// Link MongoDB asli Anda (sudah ditambahkan folder voting_db)
const MONGODB_URI = "mongodb+srv://defriadyfarel2_db_user:WyFkQukXehv4X248@cluster0.pnnlotx.mongodb.net/voting_db?appName=Cluster0";

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log("Menghubungkan ke database...");
        
        // Memanggil tabel finalis
        const Finalis = mongoose.model('Finalis', new mongoose.Schema({}));
        
        // MENGHAPUS SEMUA DATA CACAT SECARA PAKSA
        await Finalis.deleteMany({});
        
        console.log("✅ SUKSES BESAR: Semua data cacat (Apek, dll) resmi dimusnahkan dari MongoDB!");
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ Gagal terhubung:", err);
        process.exit(1);
    });