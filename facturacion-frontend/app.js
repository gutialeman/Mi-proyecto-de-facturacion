// ===============================
//  APP.JS CORREGIDO COMPLETO
// ===============================

/* --- CONFIGURACIÓN GLOBAL --- */
const IVA_RATE = 0.15;
let productsList = [];
let invoiceCounter = 1; // contador de facturas automático
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

/* --- CONSTANTES DEL BACKEND --- */
const API_BASE_URL = 'http://localhost:3000';

/* --- MODELO --- */
class Producto {
  constructor(nombre, cantidad, precio) {
    this.nombre = nombre;
    this.cantidad = parseFloat(cantidad) || 0;
    this.precioUnitario = parseFloat(precio) || 0;
    this.total = this.cantidad * this.precioUnitario;
  }
}

/* ===============================
   1. AUTENTICACIÓN (LOGIN / LOGOUT)
   =============================== */
function checkAuthentication() {
  if (window.location.pathname.includes('facturacion.html') &&
      sessionStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = 'login.html';
  }
}

function handleLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = (document.getElementById('username')?.value || '').trim();
    const password = (document.getElementById('password')?.value || '').trim();
    const errorMsg = document.getElementById('login-error');

    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }

    if (!username || !password) {
      if (errorMsg) {
        errorMsg.textContent = 'Por favor, completa todos los campos.';
        errorMsg.style.display = 'block';
      }
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/iniciar-sesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: username, contraseña: password })
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userName', data.nombre || username);
        window.location.href = 'facturacion.html';
      } else {
        if (errorMsg) {
          errorMsg.textContent = data.error || 'Usuario o contraseña incorrectos.';
          errorMsg.style.display = 'block';
        } else {
          alert(data.error || 'Usuario o contraseña incorrectos.');
        }
      }
    } catch (err) {
      console.error('Error conexión:', err);
      if (errorMsg) {
        errorMsg.textContent = 'Error al conectar con el servidor.';
        errorMsg.style.display = 'block';
      } else {
        alert('Error al conectar con el servidor.');
      }
    }
  });
}

function handleLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'login.html';
  });
}

/* ===============================
   2. LÓGICA DE FACTURACIÓN
   =============================== */
function recalculateSummary() {
  const subtotal = productsList.reduce((sum, p) => sum + (p.total || 0), 0);
  const iva = subtotal * IVA_RATE;
  const total = subtotal + iva;

  const subtotalEl = document.getElementById('subtotal-val');
  const ivaEl = document.getElementById('iva-val');
  const totalEl = document.getElementById('total-val');

  if (subtotalEl) subtotalEl.textContent = formatter.format(subtotal);
  if (ivaEl) ivaEl.textContent = formatter.format(iva);
  if (totalEl) totalEl.textContent = formatter.format(total);
}

function renderProductDetail() {
  const tableBody = document.getElementById('products-detail');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  productsList.forEach((p, i) => {
    const row = tableBody.insertRow();
    const cellNombre = row.insertCell();
    const cellCant = row.insertCell();
    const cellPU = row.insertCell();
    const cellTotal = row.insertCell();
    const cellAcc = row.insertCell();

    cellNombre.textContent = p.nombre;
    cellCant.textContent = p.cantidad;
    cellPU.textContent = formatter.format(p.precioUnitario);
    cellTotal.textContent = formatter.format(p.total);
    cellAcc.innerHTML = `<button class="btn-remove" data-index="${i}" aria-label="Eliminar producto ${p.nombre}">X</button>`;
  });

  recalculateSummary();

  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.onclick = removeProduct;
  });
}

function handleAddProduct() {
  const btn = document.getElementById('add-product-btn');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const nombre = (document.getElementById('prodNombre')?.value || '').trim();
    const cantidad = parseFloat(document.getElementById('prodCantidad')?.value) || 0;
    const precio = parseFloat(document.getElementById('prodPrecio')?.value) || 0;

    if (!nombre || cantidad <= 0 || precio <= 0) {
      alert('Por favor ingresa nombre, cantidad (>0) y precio (>0).');
      return;
    }

    productsList.push(new Producto(nombre, cantidad, precio));
    renderProductDetail();

    document.getElementById('prodNombre').value = '';
    document.getElementById('prodCantidad').value = '1';
    document.getElementById('prodPrecio').value = '0.00';
    document.getElementById('prodNombre').focus();
  });
}

function removeProduct(evt) {
  const index = Number(evt.target?.dataset?.index);
  if (!Number.isNaN(index)) {
    productsList.splice(index, 1);
    renderProductDetail();
  }
}

function handleSaveInvoice() {
  const saveBtn = document.getElementById('save-invoice-btn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Factura guardada con éxito');

    // Incrementar factura automáticamente
    const numFacturaEl = document.getElementById('numFactura');
    if (numFacturaEl) {
      invoiceCounter++;
      numFacturaEl.value = invoiceCounter;
    }

    // LIMPIAR CAMPOS AUTOMÁTICAMENTE
    document.getElementById('vendedorNombre').value = "";
    document.getElementById('vendedorCargo').value = "";
    document.getElementById('nombreCliente').value = "";
    document.getElementById('identificacion').value = "";
    document.getElementById('prodNombre').value = "";
    document.getElementById('prodCantidad').value = "1";
    document.getElementById('prodPrecio').value = "0.00";

    productsList = [];
    renderProductDetail();

    const fechaEl = document.getElementById('fechaEmision');
    if (fechaEl) fechaEl.valueAsDate = new Date();
  });
}

function handlePrintInvoice() {
  const printBtn = document.getElementById('print-invoice-btn');
  if (!printBtn) return;
  printBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.print();
  });
}

/* ===============================
   3. HORA AUTOMÁTICA EN EMPLEADO
   =============================== */
function updateClock() {
  const hourEl = document.getElementById('vendedorHora'); // ← CORREGIDO

  if (!hourEl) return;

  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  hourEl.value = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')} ${ampm}`;
}

setInterval(updateClock, 1000);

/* ===============================
   4. REGISTRO DE USUARIOS
   =============================== */
function handleRegister() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('reg-name')?.value || '').trim();
    const pass = (document.getElementById('reg-pass')?.value || '').trim();

    if (!name || !pass) {
      alert('Completa todos los campos.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name, contraseña: pass })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`Error en registro: ${data.error || 'Nombre ya existe'}`);
        return;
      }

      alert('Registro exitoso. Ya podés iniciar sesión.');
      form.reset();

      document.getElementById('register-container')?.classList.add('hidden');
      document.getElementById('login-container')?.classList.remove('hidden');
      const userField = document.getElementById('username');
      if (userField) {
        userField.value = name;
        userField.focus();
      }
    } catch (err) {
      console.error('Error registrar:', err);
      alert('No se pudo conectar con el servidor.');
    }
  });
}

/* ===============================
   5. INICIALIZACIÓN
   =============================== */
document.addEventListener('DOMContentLoaded', () => {
  checkAuthentication();

  // Login
  if (document.querySelector('.login-body-content')) {
    handleLogin();
    handleRegister();

    const showLoginBtn = document.getElementById('show-login-btn');
    if (showLoginBtn) {
      showLoginBtn.addEventListener('click', () => {
        document.getElementById('welcome-screen')?.classList.add('hidden');
        document.getElementById('register-container')?.classList.add('hidden');
        document.getElementById('login-container')?.classList.remove('hidden');
        document.getElementById('username')?.focus();
      });
    }

    document.getElementById('show-register-btn')?.addEventListener('click', () => {
      document.getElementById('welcome-screen')?.classList.add('hidden');
      document.getElementById('login-container')?.classList.add('hidden');
      document.getElementById('register-container')?.classList.remove('hidden');
    });

    document.getElementById('close-register')?.addEventListener('click', () => {
      document.getElementById('register-container')?.classList.add('hidden');
      document.getElementById('welcome-screen')?.classList.remove('hidden');
    });
  }

  // Facturación
  if (document.getElementById('products-detail')) {
    const fechaEl = document.getElementById('fechaEmision');
    if (fechaEl) fechaEl.valueAsDate = new Date();

    const empresaEl = document.getElementById('empresaSesion');
    if (empresaEl) empresaEl.value = sessionStorage.getItem('userName') || '';

    const numFacturaEl = document.getElementById('numFactura');
    if (numFacturaEl) numFacturaEl.value = invoiceCounter;

    handleAddProduct();
    handleSaveInvoice();
    handlePrintInvoice();
    handleLogout();

    renderProductDetail();
  }

  updateClock();
});



