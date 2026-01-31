import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, getDocs, orderBy, query, limit } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// --- 1. CONFIGURACIÓN FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAv4-551jF2b9ulr2-YAjNDkj0q9qCFGL8",
  authDomain: "nexus-bodega.firebaseapp.com",
  projectId: "nexus-bodega",
  storageBucket: "nexus-bodega.firebasestorage.app",
  messagingSenderId: "956269067891",
  appId: "1:956269067891:web:c7039f4cf8e3bbc6103406",
  measurementId: "G-G4ZV8DM4X3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- 2. ESTADO GLOBAL ---
let inventoryData = [];
let warehousesData = [];
let snapshotsData = []; // Guardaremos los cierres de semana aquí
let currentUser = null;
let comparisonChart = null;

// --- 3. FUNCIONES EXPORTADAS (Globales) ---
window.loginWithGoogle = () => signInWithPopup(auth, provider).catch(e => alert(e.message));
window.logout = () => signOut(auth);

window.app = {
    // --- GESTIÓN DE VISTAS ---
    toggleView: (viewName) => {
        ['dashboard', 'analytics', 'audit'].forEach(v => {
            document.getElementById(`view-${v}`).classList.add('hidden');
            const btn = document.getElementById(`btn-${v}`);
            if(btn) {
                btn.classList.remove('text-blue-400');
                btn.classList.add('text-slate-400');
            }
        });
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
        document.getElementById(`btn-${viewName}`).classList.add('text-blue-400');
        document.getElementById(`btn-${viewName}`).classList.remove('text-slate-400');

        // Cargar datos específicos de la vista
        if(viewName === 'audit') loadAuditLogs();
        if(viewName === 'analytics') populateWeekSelectors();
    },
    
    toggleModal: (id) => document.getElementById(id).classList.toggle('hidden'),

    // --- LOGICA DE BODEGAS ---
    createWarehouse: async () => {
        const name = document.getElementById('new-warehouse-name').value;
        if(!name) return alert("Ingrese un nombre");
        
        try {
            await addDoc(collection(db, "warehouses"), {
                name: name,
                created_at: new Date(),
                created_by: currentUser.email
            });
            await logAudit("CREAR_BODEGA", `Nueva sucursal: ${name}`, "GLOBAL");
            document.getElementById('new-warehouse-name').value = "";
            window.app.toggleModal('modal-bodega');
        } catch (e) { alert("Error: " + e.message); }
    },

    // --- LOGICA DE PRODUCTOS ---
    addProduct: async () => {
        const sku = document.getElementById('input-sku').value;
        const name = document.getElementById('input-name').value;
        const stock = parseInt(document.getElementById('input-stock').value);
        const cost = parseFloat(document.getElementById('input-cost').value);
        const warehouse = document.getElementById('bodega-selector').value;

        if (!sku || !name || isNaN(stock) || warehouse === "todas") {
            return alert("Complete datos y seleccione una BODEGA ESPECÍFICA.");
        }

        try {
            await addDoc(collection(db, "inventory"), {
                sku, name, stock, cost, warehouse,
                min_stock: 3, 
                updated_at: new Date()
            });
            await logAudit("ALTA_PRODUCTO", `SKU: ${sku} (${stock}u)`, warehouse);
            document.getElementById('input-sku').value = ''; 
            document.getElementById('input-name').value = '';
            // No limpiamos bodega para seguir agregando rápido
        } catch(e) { alert(e.message); }
    },

    updateStock: async (id, current, change, name, warehouse) => {
        const newItem = current + change;
        if(newItem < 0) return alert("Stock no puede ser negativo");
        
        await updateDoc(doc(db, "inventory", id), { stock: newItem });
        await logAudit(change > 0 ? "ENTRADA" : "SALIDA", `${name}: ${change > 0 ? '+' : ''}${change}`, warehouse);
    },

    renderTable: () => {
        const tbody = document.getElementById('inventory-table-body');
        tbody.innerHTML = '';
        const selectedBodega = document.getElementById('bodega-selector').value;
        const search = document.getElementById('search-bar').value.toLowerCase();

        // FILTRO PRINCIPAL: Bodega + Búsqueda
        const filtered = inventoryData.filter(i => {
            const matchBodega = selectedBodega === 'todas' || i.warehouse === selectedBodega;
            const matchSearch = i.name.toLowerCase().includes(search) || i.sku.includes(search);
            return matchBodega && matchSearch;
        });

        filtered.forEach(i => {
            // Lógica Semáforo
            let badge = `<span class="px-2 py-1 rounded text-xs border bg-slate-700 text-white border-slate-500">NORMAL</span>`;
            let colorStock = "text-white";

            if (i.stock === 0) {
                badge = `<span class="px-2 py-1 rounded text-xs border bg-red-500/20 text-red-400 border-red-500 font-bold animate-pulse">AGOTADO</span>`;
                colorStock = "text-red-500 font-bold";
            } else if (i.stock <= i.min_stock) {
                badge = `<span class="px-2 py-1 rounded text-xs border bg-yellow-500/20 text-yellow-400 border-yellow-500 font-bold">BAJO</span>`;
                colorStock = "text-yellow-400";
            }
            
            tbody.innerHTML += `
                <tr class="hover:bg-slate-700/30 border-b border-slate-700 transition">
                    <td class="p-4 font-mono text-slate-300">${i.sku}</td>
                    <td class="p-4 font-bold">${i.name}</td>
                    <td class="p-4 text-xs text-slate-400 uppercase">${i.warehouse}</td>
                    <td class="p-4 text-center ${colorStock} text-lg">${i.stock}</td>
                    <td class="p-4 text-center">${badge}</td>
                    <td class="p-4 text-center flex justify-center gap-2">
                        <button onclick="app.updateStock('${i.id}', ${i.stock}, 1, '${i.name}', '${i.warehouse}')" class="bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded font-bold transition">+</button>
                        <button onclick="app.updateStock('${i.id}', ${i.stock}, -1, '${i.name}', '${i.warehouse}')" class="bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded font-bold transition">-</button>
                    </td>
                </tr>
            `;
        });
        updateKPIs(filtered);
    },

    generatePDF: () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const bodega = document.getElementById('bodega-selector').value.toUpperCase();
        const date = new Date().toLocaleDateString();

        doc.setFontSize(18);
        doc.text(`REPORTE DE INVENTARIO - ${date}`, 14, 20);
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`BODEGA: ${bodega}`, 14, 30);

        // Capturar datos visibles actualmente en la tabla
        const rows = [];
        document.querySelectorAll('#inventory-table-body tr').forEach(tr => {
            const cols = tr.querySelectorAll('td');
            rows.push([cols[0].innerText, cols[1].innerText, cols[2].innerText, cols[3].innerText]);
        });

        doc.autoTable({
            head: [['SKU', 'PRODUCTO', 'UBICACIÓN', 'STOCK']],
            body: rows,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] } // Color Slate-800
        });

        doc.save(`Nexus_Report_${bodega}_${date}.pdf`);
    },

    // --- 4. ANALÍTICA Y REPORTES COMPARATIVOS (TU REQUISITO CLAVE) ---
    
    // Función para "Congelar" la semana (Snapshot)
    takeWeeklySnapshot: async () => {
        const weekNum = getWeekNumber(new Date());
        const year = new Date().getFullYear();
        
        if(confirm(`¿Desea cerrar la Semana ${weekNum} - ${year} y guardar el estado actual de TODAS las bodegas?`)) {
            try {
                // Guardamos TODO el array de inventario actual en una colección "snapshots"
                await addDoc(collection(db, "snapshots"), {
                    week: weekNum,
                    year: year,
                    data: inventoryData, // Array completo
                    created_at: new Date()
                });
                await logAudit("SNAPSHOT", `Cierre de Semana ${weekNum}`, "SISTEMA");
                alert("Snapshot guardado exitosamente.");
                populateWeekSelectors(); // Recargar selectores
            } catch(e) { alert("Error: " + e.message); }
        }
    },

    // Función Crítica: Renderizar Gráfico con Comparación Estricta
    renderAnalytics: () => {
        const selectedWarehouse = document.getElementById('bodega-selector').value;
        const weekA_ID = document.getElementById('week-a-select').value;
        const weekB_ID = document.getElementById('week-b-select').value;

        // 1. Validación de Bodega
        if (selectedWarehouse === "todas") {
            alert("⚠️ POR FAVOR, SELECCIONA UNA BODEGA ESPECÍFICA EN EL MENÚ SUPERIOR.\n\nPara comparar el rendimiento, el sistema necesita saber qué bodega analizar.");
            return;
        }

        if (!weekA_ID || !weekB_ID) {
            alert("Selecciona dos semanas para comparar.");
            return;
        }

        // 2. Obtener los Snapshots seleccionados
        const snapshotA = snapshotsData.find(s => s.id === weekA_ID);
        const snapshotB = snapshotsData.find(s => s.id === weekB_ID);

        // 3. FILTRADO ESTRICTO POR BODEGA (Aquí ocurre la magia)
        // De todo el snapshot global, extraemos SOLO los items que coinciden con la bodega seleccionada
        const dataA = snapshotA.data.filter(item => item.warehouse === selectedWarehouse);
        const dataB = snapshotB.data.filter(item => item.warehouse === selectedWarehouse);

        // 4. Calcular Totales (Ej: Stock Total)
        const totalStockA = dataA.reduce((sum, item) => sum + item.stock, 0);
        const totalStockB = dataB.reduce((sum, item) => sum + item.stock, 0);
        
        // También podemos calcular valorización
        const valorA = dataA.reduce((sum, item) => sum + (item.stock * item.cost), 0);
        const valorB = dataB.reduce((sum, item) => sum + (item.stock * item.cost), 0);

        // 5. Dibujar Gráfico
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        if(comparisonChart) comparisonChart.destroy();

        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [`Semana ${snapshotA.week} (${snapshotA.year})`, `Semana ${snapshotB.week} (${snapshotB.year})`],
                datasets: [
                    {
                        label: `Stock Total Unidades - ${selectedWarehouse}`,
                        data: [totalStockA, totalStockB],
                        backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(168, 85, 247, 0.6)'], // Azul y Morado
                        borderColor: ['#3b82f6', '#a855f7'],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white' } },
                    title: { display: true, text: `Evolución de Inventario: ${selectedWarehouse}`, color: 'white', font: {size: 16} }
                },
                scales: {
                    y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, beginAtZero: true },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                }
            }
        });
    }
};

// --- LOGICA DE EVENTOS (LISTENERS) ---

// 1. Inventario en tiempo real
onSnapshot(collection(db, "inventory"), (snap) => {
    inventoryData = snap.docs.map(d => ({id: d.id, ...d.data()}));
    window.app.renderTable();
});

// 2. Bodegas en tiempo real
onSnapshot(collection(db, "warehouses"), (snap) => {
    const select = document.getElementById('bodega-selector');
    const current = select.value;
    select.innerHTML = '<option value="todas">🌎 Visión Global</option>';
    
    snap.forEach(doc => {
        const w = doc.data();
        select.innerHTML += `<option value="${w.name}">🏭 ${w.name}</option>`;
    });
    select.value = current;
});

// 3. Snapshots (Para llenar los selectores de semanas)
onSnapshot(query(collection(db, "snapshots"), orderBy("created_at", "desc")), (snap) => {
    snapshotsData = snap.docs.map(d => ({id: d.id, ...d.data()}));
    // Si estamos en la vista analytics, refrescar selectores
    if(!document.getElementById('view-analytics').classList.contains('hidden')){
        populateWeekSelectors();
    }
});

// Autenticación
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const login = document.getElementById('login-view');
    const appView = document.getElementById('app-view');
    if(user) {
        login.classList.add('hidden');
        appView.classList.remove('hidden');
    } else {
        login.classList.remove('hidden');
        appView.classList.add('hidden');
    }
});

// --- FUNCIONES AUXILIARES ---

async function logAudit(action, details, warehouse) {
    await addDoc(collection(db, "audit_logs"), {
        user: currentUser.email,
        action, details, warehouse,
        timestamp: new Date()
    });
}

async function loadAuditLogs() {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    const container = document.getElementById('audit-log-container');
    container.innerHTML = '';
    
    snap.forEach(doc => {
        const d = doc.data();
        const date = d.timestamp?.toDate ? d.timestamp.toDate().toLocaleString() : 'Reciente';
        
        // Estilo según acción
        let color = "text-blue-400";
        if(d.action === "SALIDA") color = "text-red-400";
        if(d.action === "ENTRADA") color = "text-green-400";

        container.innerHTML += `
            <div class="border-b border-slate-700 py-3 flex justify-between items-center hover:bg-slate-700/30 px-2 rounded">
                <div class="flex flex-col">
                    <span class="text-xs text-slate-500 font-mono">${date}</span>
                    <span class="${color} font-bold text-sm">${d.action}</span>
                </div>
                <div class="flex-1 px-4">
                    <span class="text-slate-200 block">${d.details}</span>
                    <span class="text-xs text-slate-500 uppercase bg-slate-800 px-1 rounded">${d.warehouse}</span>
                </div>
                <span class="text-slate-500 text-xs italic">${d.user}</span>
            </div>
        `;
    });
}

function updateKPIs(data) {
    document.getElementById('kpi-total').innerText = data.length;
    const val = data.reduce((sum, i) => sum + (i.cost * i.stock), 0);
    document.getElementById('kpi-valor').innerText = `$${val.toLocaleString()}`;
    document.getElementById('kpi-alertas').innerText = data.filter(i => i.stock <= i.min_stock && i.stock > 0).length;
    document.getElementById('kpi-critico').innerText = data.filter(i => i.stock === 0).length;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
}

function populateWeekSelectors() {
    const selA = document.getElementById('week-a-select');
    const selB = document.getElementById('week-b-select');
    
    // Guardar selección actual si existe
    const currA = selA.value;
    const currB = selB.value;

    let options = '<option value="" disabled selected>Seleccionar...</option>';
    snapshotsData.forEach(s => {
        options += `<option value="${s.id}">Semana ${s.week} - ${s.year}</option>`;
    });

    selA.innerHTML = options;
    selB.innerHTML = options;

    if(currA) selA.value = currA;
    if(currB) selB.value = currB;
}