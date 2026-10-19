// src/main/resources/static/js/cart.js
// Carrinho estilo Shein: drawer lateral, adicionar/remover/alterar quantidade e persistência em localStorage
(function () {
  const CART_KEY = 'terracafe_cart_v1';

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function findItem(cart, id) {
    return cart.find(i => i.id === id);
  }

  function addToCart(item) {
    const cart = loadCart();
    const existing = findItem(cart, item.id);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 1);
    } else {
      cart.push(Object.assign({ quantity: item.quantity || 1 }, item));
    }
    saveCart(cart);
    renderCart();
    showToast(`${item.name} adicionado ao carrinho`);
  }

  function removeFromCart(id) {
    let cart = loadCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    renderCart();
  }

  function changeQuantity(id, qty) {
    const cart = loadCart();
    const item = findItem(cart, id);
    if (!item) return;
    item.quantity = qty;
    if (item.quantity <= 0) {
      removeFromCart(id);
      return;
    }
    saveCart(cart);
    renderCart();
  }

  function clearCart() {
    saveCart([]);
    renderCart();
  }

  function getCartCount() {
    const cart = loadCart();
    return cart.reduce((s, it) => s + (it.quantity || 0), 0);
  }

  function getCartTotal() {
    const cart = loadCart();
    return cart.reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 0)), 0);
  }

  function formatMoney(v) {
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function createCartDrawer() {
    if (document.getElementById('cart-drawer')) return;

    const drawer = document.createElement('div');
    drawer.id = 'cart-drawer';
    drawer.innerHTML = `
      <div class="cart-backdrop" id="cart-backdrop"></div>
      <div class="cart-panel" id="cart-panel">
        <div class="cart-header">
          <strong>Carrinho</strong>
          <button id="cart-close" aria-label="Fechar">×</button>
        </div>
        <div class="cart-content" id="cart-content"></div>
        <div class="cart-footer">
          <div class="cart-total" id="cart-total">Total: R$ 0,00</div>
          <div class="cart-actions">
            <button id="cart-clear" class="btn">Limpar</button>
            <button id="cart-checkout" class="btn btn-primary">Finalizar</button>
          </div>
        </div>
      </div>
      <button id="cart-toggle" class="cart-toggle">
        <span id="cart-count" class="cart-count">0</span>
        🛒
      </button>
    `;

    document.body.appendChild(drawer);

    // event listeners
    document.getElementById('cart-toggle').addEventListener('click', toggleCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-backdrop').addEventListener('click', closeCart);
    document.getElementById('cart-clear').addEventListener('click', () => {
      if (confirm('Deseja limpar o carrinho?')) clearCart();
    });
    document.getElementById('cart-checkout').addEventListener('click', () => {
      // ação de checkout simples: mostra alerta e limpa carrinho
      if (getCartCount() === 0) {
        alert('Seu carrinho está vazio.');
        return;
      }
      alert('Checkout simulado: seu pedido foi finalizado.');
      clearCart();
      closeCart();
    });
  }

  function toggleCart() {
    const panel = document.getElementById('cart-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    document.getElementById('cart-backdrop').classList.toggle('visible');
  }

  function closeCart() {
    const panel = document.getElementById('cart-panel');
    if (!panel) return;
    panel.classList.remove('open');
    document.getElementById('cart-backdrop').classList.remove('visible');
  }

  function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (!countEl) return;
    countEl.textContent = getCartCount();
  }

  function renderCart() {
    const container = document.getElementById('cart-content');
    const totalEl = document.getElementById('cart-total');
    if (!container || !totalEl) return;
    const cart = loadCart();
    if (cart.length === 0) {
      container.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
      totalEl.textContent = 'Total: ' + formatMoney(0);
      updateCartCount();
      return;
    }

    container.innerHTML = '';
    cart.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div class="cart-item-left">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">${formatMoney(item.price)}</div>
        </div>
        <div class="cart-item-right">
          <input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="cart-item-qty" />
          <button class="cart-item-remove" data-id="${item.id}">Remover</button>
        </div>
      `;
      container.appendChild(itemEl);
    });

    // ligar eventos
    container.querySelectorAll('.cart-item-qty').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const q = parseInt(e.target.value, 10) || 1;
        changeQuantity(id, q);
      });
    });
    container.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });

    totalEl.textContent = 'Total: ' + formatMoney(getCartTotal());
    updateCartCount();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
  }

  function bindAddButtons() {
    // botões nas páginas de produtos
    document.querySelectorAll('.add-to-cart, .btn-add-pedido').forEach(btn => {
      btn.addEventListener('click', function () {
        const card = this.closest('.item');
        if (!card) return;
        const id = card.dataset.id || (card.querySelector('h3')?.textContent || '').trim();
        const name = card.dataset.name || (card.querySelector('h3')?.textContent || '').trim();
        let price = card.dataset.price;
        if (!price) {
          const strong = card.querySelector('strong');
          price = strong ? strong.textContent.replace(/[^0-9,\.]/g, '').replace(',', '.') : '0';
        }
        const item = { id: String(id), name: String(name), price: Number(price), quantity: 1 };
        addToCart(item);
      });
    });
  }

  function showToast(text) {
    // toast simples no canto inferior
    let el = document.getElementById('cart-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cart-toast';
      el.className = 'cart-toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('visible'), 1600);
  }

  // estilos mínimos para o drawer e toast
  function injectStyles() {
    if (document.getElementById('cart-styles')) return;
    const css = `
#cart-drawer { position: fixed; z-index: 1200; right: 0; top: 0; }
.cart-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); opacity: 0; pointer-events: none; transition: opacity .2s; }
.cart-backdrop.visible { opacity: 1; pointer-events: auto; }
.cart-panel { position: fixed; right: 0; top: 0; height: 100vh; width: 360px; max-width: 90%; background: #fff; box-shadow: -8px 0 24px rgba(0,0,0,0.15); transform: translateX(100%); transition: transform .25s; display: flex; flex-direction: column; }
.cart-panel.open { transform: translateX(0%); }
.cart-header { display:flex; align-items:center; justify-content:space-between; padding:16px; border-bottom:1px solid #eee; }
.cart-content { padding:12px; overflow:auto; flex:1; }
.cart-footer { padding:12px; border-top:1px solid #eee; }
.cart-item { display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #f0f0f0; }
.cart-item-name { font-weight:600; }
.cart-item-right { display:flex; gap:8px; align-items:center; }
.cart-toggle { position: fixed; right: 20px; bottom: 20px; background:#fff; border-radius:999px; border:1px solid #ddd; padding:10px 12px; box-shadow:0 4px 12px rgba(0,0,0,0.12); cursor:pointer; z-index:1300; }
.cart-count { background:#ff3b30; color:#fff; border-radius:999px; padding:2px 6px; margin-right:6px; font-weight:700; }
.cart-toast { position: fixed; right: 20px; bottom: 80px; background: #333; color: #fff; padding:8px 12px; border-radius:8px; opacity:0; transition: opacity .2s; z-index:1400; }
.cart-toast.visible { opacity:1; }
.btn { padding:8px 12px; border:1px solid #ccc; background:#fff; border-radius:6px; cursor:pointer; }
.btn-primary { background:#81501f; color:#fff; border-color:#81501f; }
`;
    const style = document.createElement('style');
    style.id = 'cart-styles';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    createCartDrawer();
    bindAddButtons();
    renderCart();
  });

  // expor funções para debug se necessário
  window.__terracafe_cart = {
    addToCart,
    removeFromCart,
    changeQuantity,
    loadCart,
    saveCart,
    clearCart,
    renderCart
  };
})();
