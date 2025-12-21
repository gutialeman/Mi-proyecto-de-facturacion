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
            // Nota: En un entorno de producción, la API Key iría en un header o body.
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_empresa: username, password: password })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userName', data.nombre_empresa || username);
                window.location.href = 'facturacion.html';
            } else {
                if (errorMsg) {
                    errorMsg.textContent = data.error || 'Usuario o contraseña incorrectos.';
                    errorMsg.style.display = 'block';
                } else {
                    // Usar modal en lugar de alert en el futuro
                    console.error(data.error || 'Usuario o contraseña incorrectos.');
                }
            }
        } catch (err) {
            console.error('Error conexión:', err);
            if (errorMsg) {
                errorMsg.textContent = 'Error al conectar con el servidor.';
                errorMsg.style.display = 'block';
            } else {
                 // Usar modal en lugar de alert en el futuro
                console.error('Error al conectar con el servidor.');
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
            // Usar modal en lugar de alert en el futuro
            console.warn('Por favor ingresa nombre, cantidad (>0) y precio (>0).');
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
        // Usar modal en lugar de alert en el futuro
        console.log('Factura guardada con éxito');

        const numFacturaEl = document.getElementById('numFactura');
        if (numFacturaEl) {
            invoiceCounter++;
            numFacturaEl.value = invoiceCounter;
        }

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
    3. UTILIDADES DE LOGIN
    =============================== */

/**
 * Muestra una tarjeta específica y oculta las demás.
 * @param {string} targetId - ID de la tarjeta a mostrar ('welcome-screen', 'login-container', 'register-container').
 */
function showCard(targetId) {
    const welcomeScreen = document.getElementById('welcome-screen');
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');

    [welcomeScreen, loginContainer, registerContainer].forEach(card => {
        if (card) card.classList.add('hidden');
    });
    
    setTimeout(() => {
        const targetElement = document.getElementById(targetId);
        if (targetElement) targetElement.classList.remove('hidden');
    }, 10);
}

/**
 * Vuelve a la pantalla de bienvenida.
 * Usado por los botones ATRÁS en Login y Cancelar en Registro.
 */
function irAtras() {
    showCard('welcome-screen');
}

/**
 * Toggle la visibilidad de un campo de contraseña.
 * @param {Event} event - Evento de click.
 */
function togglePassword(event) {
    const targetId = event.target.getAttribute('data-target');
    const input = document.getElementById(targetId);

    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            event.target.textContent = '🙈'; // Ocultar
        } else {
            input.type = 'password';
            event.target.textContent = '👁️'; // Mostrar
        }
    }
}


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
            // Usar modal en lugar de alert en el futuro
            console.warn('Completa todos los campos.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre_empresa: name, password: pass })
            });

            const data = await response.json();

            if (!response.ok) {
                // Usar modal en lugar de alert en el futuro
                console.error(`Error en registro: ${data.error || 'El nombre ya está en uso.'}`);
                return;
            }

            // Usar modal en lugar de alert en el futuro
            console.log('Registro exitoso. Ya podés iniciar sesión.');
            form.reset();

            showCard('login-container');
            const userField = document.getElementById('username');
            if (userField) {
                userField.value = name;
                userField.focus();
            }
        } catch (err) {
            console.error('Error registrar:', err);
             // Usar modal en lugar de alert en el futuro
            console.error('No se pudo conectar con el servidor.');
        }
    });
}


/* ===============================
    5. HORA AUTOMÁTICA EN EMPLEADO
    =============================== */
function updateClock() {
    const hourEl = document.getElementById('vendedorHora');

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


/* ===============================
    6. INICIALIZACIÓN
    =============================== */
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    updateClock(); // Inicia el reloj
    setInterval(updateClock, 1000); // Mantiene el reloj actualizado

    // --- Lógica de Login (si estamos en la pantalla de acceso) ---
    if (document.querySelector('.login-body-content')) {
        handleLogin();
        handleRegister();

        const showLoginBtn = document.getElementById('show-login-btn');
        const showRegisterBtn = document.getElementById('show-register-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const settingsMenu = document.getElementById('settings-menu');
        const infoBtn = document.getElementById('info-btn');
        const infoModal = document.getElementById('info-modal');
        const toggleThemeBtn = document.getElementById('toggle-theme-btn');
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        const recoveryModal = document.getElementById('recovery-modal');
        const recoveryForm = document.getElementById('recovery-form');
        const recoveryMessage = document.getElementById('recovery-message');


        // Transición de Pantallas
        showLoginBtn?.addEventListener('click', () => showCard('login-container'));
        showRegisterBtn?.addEventListener('click', () => showCard('register-container'));

        // Toggle Contraseña
        document.querySelectorAll('.toggle-password').forEach(span => {
            span.addEventListener('click', togglePassword);
        });

        // Toggle Menú de Ajustes
        settingsBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (settingsMenu) {
                 settingsMenu.style.display = settingsMenu.style.display === 'flex' ? 'none' : 'flex';
            }
        });

        // Cierra el menú al hacer clic fuera
        window.addEventListener('click', () => {
            if (settingsMenu) settingsMenu.style.display = 'none';
        });
        settingsMenu?.addEventListener('click', (e) => e.stopPropagation()); 
        
        // Modal de Información
        infoBtn?.addEventListener('click', () => {
            if (infoModal) infoModal.style.display = 'flex';
            if (settingsMenu) settingsMenu.style.display = 'none';
        });
        infoModal?.querySelector('.close-modal')?.addEventListener('click', () => {
            if (infoModal) infoModal.style.display = 'none';
        });
        infoModal?.addEventListener('click', (e) => {
            if (e.target === infoModal) infoModal.style.display = 'none';
        });


        // Toggle Modo Oscuro/Claro
        toggleThemeBtn?.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            if (settingsMenu) settingsMenu.style.display = 'none';
        });
        
        // Modal de Recuperación (Abre)
        forgotPasswordLink?.addEventListener('click', (e) => {
            e.preventDefault();
            if (recoveryModal) recoveryModal.style.display = 'flex';
        });

        // Modal de Recuperación (Cierra)
        recoveryModal?.querySelector('.recovery-close-btn')?.addEventListener('click', () => {
            if (recoveryModal) recoveryModal.style.display = 'none';
        });
        recoveryModal?.addEventListener('click', (e) => {
            if (e.target === recoveryModal) recoveryModal.style.display = 'none';
        });
        
        // Simulación del Formulario de Recuperación
        recoveryForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            if (recoveryMessage) {
                recoveryMessage.style.display = 'block';
                recoveryMessage.style.color = '#00ff00';
                recoveryMessage.textContent = 'Enlace de recuperación enviado (simulación).';
            }
            
            setTimeout(() => {
                if (recoveryModal) recoveryModal.style.display = 'none';
                recoveryForm.reset();
                if (recoveryMessage) recoveryMessage.style.display = 'none';
            }, 3000);
        });
        
        // Simulación de Login (para evitar errores en la consola)
        document.getElementById('login-form')?.addEventListener('submit', (e) => {
            // Nota: Este listener se ejecuta antes de handleLogin()
            const errorDiv = document.getElementById('login-error');
            if (errorDiv) {
                errorDiv.textContent = "Simulación: Intento de ingreso. (Ver consola para info de API)";
                errorDiv.style.color = '#00c6ff';
                errorDiv.style.display = 'block';
            }
        });
    }

    // --- Lógica de Facturación (si estamos en la pantalla de facturación) ---
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
});



