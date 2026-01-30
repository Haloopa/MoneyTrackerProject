// Deklarasi elemen
const tanggal = document.getElementById("tanggal");
const jenis = document.getElementById("jenis");
const kategori = document.getElementById("kategori");
const deskripsi = document.getElementById("deskripsi");
const nominal = document.getElementById("nominal");
const filterBulan = document.getElementById("filterBulan");
const form = document.getElementById("formTransaksi");
const daftar = document.getElementById("daftarTransaksi");
const saldoEl = document.getElementById("saldo");
const totalMasukEl = document.getElementById("totalMasuk");
const totalKeluarEl = document.getElementById("totalKeluar");
const listMasuk = document.getElementById("listMasuk");
const listKeluar = document.getElementById("listKeluar");
const exportFilter = document.getElementById('exportFilter');
const exportMonth = document.getElementById('exportMonth');
const exportBtn = document.getElementById('exportBtn');
const filterTanggal = document.getElementById('filterTanggal');
const filterJenis = document.getElementById('filterJenis');
const filterKategori = document.getElementById('filterKategori');
const resetFilter = document.getElementById('resetFilter');

// Pemisahan Kategori
const kategoriMasuk = ["Gaji", "Bonus", "Saku", "Freelance", "Jualan", "Lainnya"];
const kategoriKeluar = ["Makan", "Transport", "Belanja", "Hiburan", "Lainnya"];

// Data transaksi
let transaksi = JSON.parse(localStorage.getItem("transaksi")) || [];
let chartMasuk, chartKeluar;
let modalEdit = null;

// Inisialisasi
function init() {
    const now = new Date();
    filterBulan.value = now.toISOString().slice(0, 7);
    exportMonth.value = now.toISOString().slice(0, 7);
    tanggal.value = now.toISOString().slice(0, 10);
    
    const modalElement = document.getElementById('modalEdit');
    if (modalElement) {
        modalEdit = new bootstrap.Modal(modalElement);
    }
    
    updateKategoriOptions();
    
    document.getElementById('editJenis').addEventListener('change', function() {
        const currentKategori = document.getElementById('editKategori').value;
        updateEditKategori(this.value, currentKategori);
    });
    
    document.getElementById('modalEdit').addEventListener('click', function(e) {
        if (e.target.id === 'simpanEditBtn') {
            simpanEdit();
        }
    });
    
    exportBtn.addEventListener('click', exportToExcel);
    
    render();
}

// Update opsi kategori berdasarkan jenis
function updateKategoriOptions() {
    const jenisDipilih = jenis.value;
    kategori.innerHTML = '';
    
    let listKategori = jenisDipilih === 'masuk' ? kategoriMasuk : kategoriKeluar;
    
    listKategori.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        option.textContent = item;
        kategori.appendChild(option);
    });
}

jenis.addEventListener('change', updateKategoriOptions);

form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!tanggal.value || !deskripsi.value || !nominal.value || nominal.value <= 0) {
        alert('Harap isi semua field dengan benar!');
        return;
    }
    
    const data = {
        tanggal: tanggal.value,
        jenis: jenis.value,
        kategori: kategori.value,
        deskripsi: deskripsi.value.trim(),
        nominal: parseFloat(nominal.value)
    };
    
    transaksi.push(data);
    simpanData();
    render();
    
    deskripsi.value = '';
    nominal.value = '';
    tanggal.value = new Date().toISOString().slice(0, 10);
});

filterBulan.addEventListener('change', render);

// Render
function render() {
    renderTable();
    updateSummary();
    renderCharts();
}

// Render tabel
function renderTable() {
    daftar.innerHTML = '';
    
    const bulanDipilih = filterBulan.value;
    
    const transaksiFilter = transaksi
        .map((t, i) => ({ ...t, index: i }))
        .filter(t => t.tanggal.startsWith(bulanDipilih))
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (transaksiFilter.length === 0) {
        daftar.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    Tidak ada transaksi untuk bulan ini
                </td>
            </tr>
        `;
        return;
    }
    
    transaksiFilter.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(t.tanggal)}</td>
            <td>
                <span class="badge ${t.jenis === 'masuk' ? 'bg-success' : 'bg-danger'}">
                    ${t.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                </span>
            </td>
            <td>${t.kategori}</td>
            <td>${t.deskripsi}</td>
            <td>Rp ${formatNumber(t.nominal)}</td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="editTransaksi(${t.index})">
                    Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="hapusTransaksi(${t.index})">
                    Hapus
                </button>
            </td>
        `;
        daftar.appendChild(row);
    });
}

// Update summary
function updateSummary() {
    const bulanDipilih = filterBulan.value;
    const transaksiBulanIni = transaksi.filter(t => t.tanggal.startsWith(bulanDipilih));
    
    let totalMasuk = 0;
    let totalKeluar = 0;
    
    transaksiBulanIni.forEach(t => {
        if (t.jenis === 'masuk') {
            totalMasuk += t.nominal;
        } else {
            totalKeluar += t.nominal;
        }
    });
    
    const saldo = totalMasuk - totalKeluar;
    
    saldoEl.textContent = `Rp ${formatNumber(saldo)}`;
    totalMasukEl.textContent = `Rp ${formatNumber(totalMasuk)}`;
    totalKeluarEl.textContent = `Rp ${formatNumber(totalKeluar)}`;
    
    saldoEl.className = saldo >= 0 ? 'text-primary' : 'text-danger';
}

// Render charts
function renderCharts() {
    const bulanDipilih = filterBulan.value;
    const transaksiBulanIni = transaksi.filter(t => t.tanggal.startsWith(bulanDipilih));
    
    const dataMasuk = {};
    const dataKeluar = {};
    
    transaksiBulanIni.forEach(t => {
        if (t.jenis === 'masuk') {
            dataMasuk[t.kategori] = (dataMasuk[t.kategori] || 0) + t.nominal;
        } else {
            dataKeluar[t.kategori] = (dataKeluar[t.kategori] || 0) + t.nominal;
        }
    });
    
    chartMasuk = updatePieChart('chartMasuk', dataMasuk, chartMasuk, true);
    
    chartKeluar = updatePieChart('chartKeluar', dataKeluar, chartKeluar, false);
    
    updateCategoryList(listMasuk, dataMasuk);
    updateCategoryList(listKeluar, dataKeluar);
}

function updatePieChart(canvasId, data, chartInstance, isMasuk) {
    const ctx = document.getElementById(canvasId);
    
    if (!ctx) return chartInstance;
    
    const labels = Object.keys(data);
    const values = Object.values(data);
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    if (labels.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return null;
    }
    
    const backgroundColors = isMasuk 
        ? ['#28a745', '#20c997', '#17a2b8', '#007bff', '#6f42c1', '#fd7e14']
        : ['#dc3545', '#e83e8c', '#ffc107', '#6f42c1', '#fd7e14'];
    
    chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
    
    return chartInstance;
}

function updateCategoryList(listElement, data) {
    listElement.innerHTML = '';
    
    if (Object.keys(data).length === 0) {
        listElement.innerHTML = '<li class="list-group-item text-muted text-center">Tidak ada data</li>';
        return;
    }
    
    const sortedEntries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    
    sortedEntries.forEach(([kategori, nominal]) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.innerHTML = `
            <span>${kategori}</span>
            <strong>Rp ${formatNumber(nominal)}</strong>
        `;
        listElement.appendChild(li);
    });
}

// CRUD
function simpanData() {
    localStorage.setItem('transaksi', JSON.stringify(transaksi));
}

function editTransaksi(index) {
    const trans = transaksi[index];
    
    if (!trans) return;
    
    document.getElementById('editIndex').value = index;
    document.getElementById('editTanggal').value = trans.tanggal;
    document.getElementById('editJenis').value = trans.jenis;
    document.getElementById('editDeskripsi').value = trans.deskripsi;
    document.getElementById('editNominal').value = trans.nominal;
    
    updateEditKategori(trans.jenis, trans.kategori);
    
    if (modalEdit) {
        modalEdit.show();
    }
}

function updateEditKategori(jenis, selectedKategori) {
    const select = document.getElementById('editKategori');
    if (!select) return;
    
    select.innerHTML = '';
    
    const list = jenis === 'masuk' ? kategoriMasuk : kategoriKeluar;
    
    list.forEach(k => {
        const option = document.createElement('option');
        option.value = k;
        option.textContent = k;
        if (k === selectedKategori) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function simpanEdit() {
    const index = document.getElementById('editIndex').value;
    
    if (index === '' || index === null) return;
    
    const editTanggal = document.getElementById('editTanggal').value;
    const editDeskripsi = document.getElementById('editDeskripsi').value;
    const editNominal = document.getElementById('editNominal').value;
    
    if (!editTanggal || !editDeskripsi || !editNominal || editNominal <= 0) {
        alert('Harap isi semua field dengan benar!');
        return;
    }
    
    transaksi[index] = {
        tanggal: editTanggal,
        jenis: document.getElementById('editJenis').value,
        kategori: document.getElementById('editKategori').value,
        deskripsi: editDeskripsi.trim(),
        nominal: parseFloat(editNominal)
    };
    
    simpanData();
    
    if (modalEdit) {
        modalEdit.hide();
    }
    
    render();
}

function hapusTransaksi(index) {
    if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
        transaksi.splice(index, 1);
        simpanData();
        render();
    }
}

// Export ke Excel
function exportToExcel() {
    const filterType = exportFilter.value;
    const month = exportMonth.value;
    
    let dataToExport = transaksi;
    
    if (month) {
        dataToExport = dataToExport.filter(t => t.tanggal.startsWith(month));
    }
    
    if (filterType !== 'all') {
        dataToExport = dataToExport.filter(t => t.jenis === filterType);
    }
    
    if (dataToExport.length === 0) {
        alert('Tidak ada data untuk diexport!');
        return;
    }
    
    const excelData = dataToExport.map((t, index) => ({
        'No': index + 1,
        'Tanggal': formatDate(t.tanggal),
        'Jenis': t.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
        'Kategori': t.kategori,
        'Deskripsi': t.deskripsi,
        'Nominal (Rp)': t.nominal
    }));
    
    const totalMasuk = dataToExport
        .filter(t => t.jenis === 'masuk')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    const totalKeluar = dataToExport
        .filter(t => t.jenis === 'keluar')
        .reduce((sum, t) => sum + t.nominal, 0);
    
    const saldo = totalMasuk - totalKeluar;
    
    excelData.push({}, {
        'No': '',
        'Tanggal': 'TOTAL',
        'Jenis': '',
        'Kategori': '',
        'Deskripsi': '',
        'Nominal (Rp)': ''
    }, {
        'No': '',
        'Tanggal': 'Total Pemasukan',
        'Jenis': '',
        'Kategori': '',
        'Deskripsi': '',
        'Nominal (Rp)': totalMasuk
    }, {
        'No': '',
        'Tanggal': 'Total Pengeluaran',
        'Jenis': '',
        'Kategori': '',
        'Deskripsi': '',
        'Nominal (Rp)': totalKeluar
    }, {
        'No': '',
        'Tanggal': 'Saldo Akhir',
        'Jenis': '',
        'Kategori': '',
        'Deskripsi': '',
        'Nominal (Rp)': saldo
    });
    
    const ws = XLSX.utils.json_to_sheet(excelData, {
        header: ['No', 'Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Nominal (Rp)'],
        skipHeader: false
    });
    
    const wscols = [
        { wch: 5 },   
        { wch: 12 },  
        { wch: 10 },  
        { wch: 12 },  
        { wch: 25 },  
        { wch: 15 }   
    ];
    ws['!cols'] = wscols;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
    
    const jenisLabel = filterType === 'all' ? 'Semua' : 
                      filterType === 'masuk' ? 'Pemasukan' : 'Pengeluaran';
    const monthLabel = month ? `_${month}` : '_SemuaBulan';
    const filename = `MyMoney_${jenisLabel}${monthLabel}_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    alert(`Data berhasil diexport!\nFile: ${filename}\nJumlah data: ${dataToExport.length} transaksi`);
}

function formatNumber(num) {
    return num.toLocaleString('id-ID');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

document.addEventListener('DOMContentLoaded', init);

window.editTransaksi = editTransaksi;
window.hapusTransaksi = hapusTransaksi;
window.simpanEdit = simpanEdit;