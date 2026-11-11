// BAMMY STORE NG storefront. Replace sample products, WhatsApp number and API settings before launch.
const CONFIG = {
  currency: "NGN",
  // Replace with your WhatsApp number in international format, e.g. 2348012345678
  whatsappNumber: "2348000000000",
  // Your backend URL. Keep Paystack secret keys on the backend only.
  apiBaseUrl: "http://localhost:4242"
};

const products = [
  {id:1,name:"Everyday Kitchen Utensil Set",category:"Kitchen & Home",price:12500,image:"https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=700&q=80",tag:"Bestseller"},
  {id:2,name:"Modern Silicone Cooking Tools",category:"Kitchen & Home",price:8500,image:"https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=700&q=80",tag:"Useful find"},
  {id:3,name:"Women's Everyday Flat Slippers",category:"Women's Footwear",price:9500,image:"https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80",tag:"Popular"},
  {id:4,name:"Comfort Casual Female Flops",category:"Women's Footwear",price:7000,image:"https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=700&q=80",tag:"Everyday"},
  {id:5,name:"Classic Corporate Handbag",category:"Women's Bags",price:22000,image:"https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=80",tag:"Featured"},
  {id:6,name:"Chic Casual Shoulder Bag",category:"Women's Bags",price:18500,image:"https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=700&q=80",tag:"New arrival"},
  {id:7,name:"Elegant Women's Perfume",category:"Perfumes",price:14500,image:"https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80",tag:"For her"},
  {id:8,name:"Fresh Men's Fragrance",category:"Perfumes",price:16000,image:"https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=80",tag:"For him"},
  {id:9,name:"Minimal Gold-tone Chain",category:"Jewellery",price:6500,image:"https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=700&q=80",tag:"Elegant"},
  {id:10,name:"Classic Everyday Ring",category:"Jewellery",price:4500,image:"https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=700&q=80",tag:"Lovely pick"},
  {id:11,name:"Women's Classic Wristwatch",category:"Wristwatches",price:18500,image:"https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=80",tag:"Timeless"},
  {id:12,name:"Men's Smart Casual Watch",category:"Wristwatches",price:21000,image:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80",tag:"Popular"}
];

const money = value => new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(value);
let cart = JSON.parse(localStorage.getItem("bammyCart") || "[]");

const productGrid = document.getElementById("productGrid");
const categoryFilter = document.getElementById("categoryFilter");
const searchInput = document.getElementById("searchInput");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const toast = document.getElementById("toast");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}
function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = products.filter(p => (category === "All" || p.category === category) &&
    (p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)));
  productGrid.innerHTML = filtered.map(p => `
    <article class="product-card">
      <div class="product-image"><img loading="lazy" src="${p.image}" alt="${escapeHTML(p.name)}"><span class="product-tag">${escapeHTML(p.tag)}</span></div>
      <div class="product-info"><span class="product-category">${escapeHTML(p.category)}</span><h3>${escapeHTML(p.name)}</h3>
        <div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-btn" data-add="${p.id}">Add to bag +</button></div>
      </div>
    </article>`).join("");
  document.getElementById("emptyState").hidden = filtered.length !== 0;
}
function saveCart() {
  localStorage.setItem("bammyCart", JSON.stringify(cart));
  renderCart();
}
function addToCart(id) {
  const existing = cart.find(item => item.id === id);
  existing ? existing.quantity++ : cart.push({id,quantity:1});
  saveCart(); showToast("Added to your shopping bag.");
}
function updateQuantity(id, delta) {
  const item = cart.find(row => row.id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) cart = cart.filter(row => row.id !== id);
  saveCart();
}
function cartDetails() {
  return cart.map(row => ({...products.find(p => p.id === row.id),quantity:row.quantity})).filter(row => row.id);
}
function cartTotal() { return cartDetails().reduce((sum,item) => sum + item.price * item.quantity,0); }
function renderCart() {
  const items = cartDetails();
  document.getElementById("cartCount").textContent = items.reduce((sum,item) => sum + item.quantity,0);
  document.getElementById("cartSubtotal").textContent = money(cartTotal());
  document.getElementById("checkoutTotal").textContent = money(cartTotal());
  document.getElementById("cartItems").innerHTML = items.length ? items.map(item => `
    <div class="cart-row"><img src="${item.image}" alt=""><div><h4>${escapeHTML(item.name)}</h4><small>${money(item.price)} each</small>
      <div class="qty-controls"><button data-qty="${item.id}" data-delta="-1" aria-label="Decrease quantity">−</button><b>${item.quantity}</b><button data-qty="${item.id}" data-delta="1" aria-label="Increase quantity">+</button></div></div>
      <div><b>${money(item.price * item.quantity)}</b><br><button class="remove-btn" data-remove="${item.id}">Remove</button></div></div>`).join("") : '<p class="empty-state">Your shopping bag is empty. Add something lovely!</p>';
}
function openCart() {
  cartDrawer.classList.add("open"); cartOverlay.classList.add("show");
  cartDrawer.setAttribute("aria-hidden","false");
}
function closeCart() {
  cartDrawer.classList.remove("open"); cartOverlay.classList.remove("show");
  cartDrawer.setAttribute("aria-hidden","true");
}
function showToast(message) {
  toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"),2400);
}
function openCheckout() {
  if (!cart.length) return showToast("Your shopping bag is empty.");
  closeCart(); document.getElementById("checkoutBackdrop").classList.add("show");
}
function closeCheckout() { document.getElementById("checkoutBackdrop").classList.remove("show"); }

products.map(p=>p.category).filter((v,i,a)=>a.indexOf(v)===i).forEach(category=>{
  const option=document.createElement("option"); option.value=category; option.textContent=category; categoryFilter.appendChild(option);
});

document.addEventListener("click",event=>{
  const add=event.target.closest("[data-add]");
  const qty=event.target.closest("[data-qty]");
  const remove=event.target.closest("[data-remove]");
  const category=event.target.closest("[data-category]");
  if(add) addToCart(Number(add.dataset.add));
  if(qty) updateQuantity(Number(qty.dataset.qty),Number(qty.dataset.delta));
  if(remove){cart=cart.filter(item=>item.id!==Number(remove.dataset.remove));saveCart();}
  if(category){categoryFilter.value=category.dataset.category;renderProducts();document.getElementById("products").scrollIntoView({behavior:"smooth"});}
});
searchInput.addEventListener("input",renderProducts);
categoryFilter.addEventListener("change",renderProducts);
document.getElementById("searchFocus").addEventListener("click",()=>{document.getElementById("products").scrollIntoView({behavior:"smooth"});searchInput.focus();});
document.getElementById("openCart").addEventListener("click",openCart);
document.getElementById("closeCart").addEventListener("click",closeCart);
document.getElementById("continueShopping").addEventListener("click",closeCart);
cartOverlay.addEventListener("click",closeCart);
document.getElementById("checkoutButton").addEventListener("click",openCheckout);
document.getElementById("closeCheckout").addEventListener("click",closeCheckout);
document.getElementById("checkoutBackdrop").addEventListener("click",e=>{if(e.target.id==="checkoutBackdrop")closeCheckout();});
document.getElementById("menuToggle").addEventListener("click",()=>{
  const nav=document.getElementById("mainNav");nav.classList.toggle("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded",nav.classList.contains("open"));
});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>document.getElementById("mainNav").classList.remove("open")));
document.getElementById("footerWhatsapp").href=`https://wa.me/${CONFIG.whatsappNumber}`;
document.getElementById("year").textContent=new Date().getFullYear();

document.getElementById("newsletterForm").addEventListener("submit",e=>{
  e.preventDefault();showToast("Thanks for subscribing! Connect a mailing-list service to save subscribers.");e.target.reset();
});

// Checkout creates an order on your server. The server starts/verifies Paystack payments.
// Do not replace this with a secret key in browser JavaScript.
document.getElementById("checkoutForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget, button=document.getElementById("placeOrderButton"), message=document.getElementById("checkoutMessage");
  const formData=new FormData(form);
  const order={
    customer:{name:formData.get("name"),phone:formData.get("phone"),email:formData.get("email"),address:formData.get("address")},
    paymentMethod:formData.get("paymentMethod"),
    items:cartDetails().map(item=>({productId:item.id,name:item.name,quantity:item.quantity,unitPrice:item.price}))
  };
  button.disabled=true;button.textContent="Creating your order...";message.textContent="";
  try{
    const response=await fetch(`${CONFIG.apiBaseUrl}/api/orders`,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(order)
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"Unable to create order.");
    if(order.paymentMethod==="card"){
      if(!result.authorizationUrl)throw new Error("Payment link was not returned by the server.");
      window.location.href=result.authorizationUrl;
      return;
    }
    message.textContent=`Order ${result.orderReference} created. Transfer ${money(result.amount)} to ${result.bankDetails.bankName}, account name: ${result.bankDetails.accountName}, account number: ${result.bankDetails.accountNumber}. Use ${result.orderReference} as your transfer narration. Your order will be confirmed after payment is verified.`;
    cart=[];saveCart();
  }catch(error){
    message.textContent=`Could not complete checkout: ${error.message}. For a demo, start the backend and configure your payment provider first.`;
  }finally{
    button.disabled=false;button.textContent="Place order & continue";
  }
});

renderProducts();renderCart();
