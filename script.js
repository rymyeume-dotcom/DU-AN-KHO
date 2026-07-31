let inventory = JSON.parse(localStorage.getItem('SMART_INVENTORY')) || [
    { id: '1', code: 'SP-101', name: 'Bàn phím cơ AKKO', qty: 25, price: 1250000, category: 'Điện tử' },
    { id: '2', code: 'SP-102', name: 'Chuột Logitech G102', qty: 5, price: 450000, category: 'Điện tử' },
    { id: '3', code: 'SP-103', name: 'Áo Polo Nam Uni', qty: 0, price: 290000, category: 'Thời trang' }
];

let sortConfig = { field: null, direction: 'asc' };
let html5QrcodeScanner = null;

const tableBody = document.getElementById('table-body');
const productForm = document.getElementById('product-form');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');

const btnScanQr = document.getElementById('btn-scan-qr');
const qrModal = document.getElementById('qr-modal');
const btnStopQr = document.getElementById('btn-stop-qr');
const closeQrModal = document.getElementById('close-qr-modal');

document.addEventListener('DOMContentLoaded', () => {
    renderApp();

    productForm.addEventListener('submit', handleAddProduct);

    searchInput.addEventListener('input', renderTable);
    filterStatus.addEventListener('change', renderTable);

    btnScanQr.addEventListener('click', startQRScanner);
    btnStopQr.addEventListener('click', stopQRScanner);
    closeQrModal.addEventListener('click', stopQRScanner);

    document.getElementById('close-edit-modal').addEventListener('click', () => document.getElementById('edit-modal').style.display = 'none');
    document.getElementById('close-print-modal').addEventListener('click', () => document.getElementById('print-qr-modal').style.display = 'none');
    document.getElementById('edit-form').addEventListener('submit', handleSaveEdit);

    document.getElementById('btn-export').addEventListener('click', exportToCSV);
    document.getElementById('btn-clear-all').addEventListener('click', handleClearAll);
});

function startQRScanner() {
    qrModal.style.display = 'flex';

    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode("qr-reader");
    }

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        onScanSuccess
    ).catch(err => {
        alert("Không thể mở Camera! Vui lòng cho phép quyền truy cập Camera.");
        stopQRScanner();
    });
}

function onScanSuccess(decodedText) {
    playBeepSound();
    document.getElementById('p-code').value = decodedText;

    const existingProduct = inventory.find(i => i.code.toLowerCase() === decodedText.toLowerCase());
    if (existingProduct) {
        document.getElementById('p-name').value = existingProduct.name;
        document.getElementById('p-price').value = existingProduct.price;
        document.getElementById('p-category').value = existingProduct.category;
    }

    stopQRScanner();
}

function stopQRScanner() {
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
        html5QrcodeScanner.stop().then(() => {
            qrModal.style.display = 'none';
        }).catch(() => {
            qrModal.style.display = 'none';
        });
    } else {
        qrModal.style.display = 'none';
    }
}

function playBeepSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}

function showProductQR(code, name) {
    const printModal = document.getElementById('print-qr-modal');
    const qrContainer = document.getElementById('qr-code-display');
    
    qrContainer.innerHTML = '';
    document.getElementById('qr-product-title').textContent = code;
    document.getElementById('qr-product-sub').textContent = name;

    new QRCode(qrContainer, {
        text: code,
        width: 150,
        height: 150
    });

    printModal.style.display = 'flex';
}

function saveData() {
    localStorage.setItem('SMART_INVENTORY', JSON.stringify(inventory));
}

function renderApp() {
    renderTable();
    updateKPIs();
    saveData();
}

function renderTable() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusFilter = filterStatus.value;

    let filtered = inventory.filter(item => {
        const matchesSearch = item.code.toLowerCase().includes(searchTerm) || 
                              item.name.toLowerCase().includes(searchTerm);
        
        let matchesStatus = true;
        if (statusFilter === 'IN_STOCK') matchesStatus = item.qty >= 10;
        if (statusFilter === 'LOW_STOCK') matchesStatus = item.qty > 0 && item.qty < 10;
        if (statusFilter === 'OUT_OF_STOCK') matchesStatus = item.qty === 0;

        return matchesSearch && matchesStatus;
    });

    tableBody.innerHTML = '';
    
    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding: 20px;">Không có dữ liệu!</td></tr>`;
        return;
    }

    filtered.forEach(item => {
        let badgeHTML = item.qty === 0 
            ? `<span class="badge badge-danger">Hết hàng</span>`
            : item.qty < 10 
            ? `<span class="badge badge-warning">Sắp hết (${item.qty})</span>` 
            : `<span class="badge badge-success">Còn hàng</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><b>${item.code}</b></td>
            <td>${item.name}</td>
            <td><span class="category-tag">${item.category}</span></td>
            <td>${item.qty}</td>
            <td>${item.price.toLocaleString('vi-VN')} đ</td>
            <td>${badgeHTML}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-show-qr" title="In Tem QR" onclick="showProductQR('${item.code}', '${item.name}')"><i class="fa-solid fa-qrcode"></i></button>
                    <button class="btn-icon btn-edit" title="Sửa" onclick="openEditModal('${item.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon btn-delete" title="Xóa" onclick="deleteProduct('${item.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateKPIs() {
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((sum, item) => sum + item.qty, 0);
    const totalValue = inventory.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const lowStockCount = inventory.filter(item => item.qty < 10).length;

    document.getElementById('kpi-total-items').textContent = totalItems;
    document.getElementById('kpi-total-qty').textContent = totalQty.toLocaleString('vi-VN');
    document.getElementById('kpi-total-value').textContent = totalValue.toLocaleString('vi-VN') + ' đ';
    document.getElementById('kpi-low-stock').textContent = lowStockCount;
}

function handleAddProduct(e) {
    e.preventDefault();
    const code = document.getElementById('p-code').value.trim();

    const existingIndex = inventory.findIndex(item => item.code.toLowerCase() === code.toLowerCase());
    
    if (existingIndex !== -1) {
        const addQty = parseInt(document.getElementById('p-qty').value);
        inventory[existingIndex].qty += addQty;
        inventory[existingIndex].price = parseInt(document.getElementById('p-price').value);
        alert(`Đã cộng dồn +${addQty} sản phẩm vào mã ${code}!`);
    } else {
        const newItem = {
            id: Date.now().toString(),
            code: code,
            name: document.getElementById('p-name').value.trim(),
            qty: parseInt(document.getElementById('p-qty').value),
            price: parseInt(document.getElementById('p-price').value),
            category: document.getElementById('p-category').value
        };
        inventory.push(newItem);
    }

    productForm.reset();
    renderApp();
}

function deleteProduct(id) {
    if (confirm('Xóa sản phẩm này khỏi kho?')) {
        inventory = inventory.filter(item => item.id !== id);
        renderApp();
    }
}

function openEditModal(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-qty').value = item.qty;
    document.getElementById('edit-price').value = item.price;
    document.getElementById('edit-category').value = item.category;

    document.getElementById('edit-modal').style.display = 'flex';
}

function handleSaveEdit(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const item = inventory.find(i => i.id === id);

    if (item) {
        item.name = document.getElementById('edit-name').value.trim();
        item.qty = parseInt(document.getElementById('edit-qty').value);
        item.price = parseInt(document.getElementById('edit-price').value);
        item.category = document.getElementById('edit-category').value;
        
        document.getElementById('edit-modal').style.display = 'none';
        renderApp();
    }
}

function exportToCSV() {
    if (inventory.length === 0) return alert('Kho trống!');
    let csv = "data:text/csv;charset=utf-8,\uFEFFMã SP,Tên SP,Danh Mục,Số Lượng,Đơn Giá\n";
    inventory.forEach(i => csv += `"${i.code}","${i.name}","${i.category}",${i.qty},${i.price}\n`);
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Kho_Hang_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

function handleClearAll() {
    if (confirm('XÓA TOÀN BỘ KHO HÀNG?')) {
        inventory = [];
        renderApp();
    }
}