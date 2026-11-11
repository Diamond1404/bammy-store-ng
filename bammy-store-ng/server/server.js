// Minimal Node/Express backend example for BAMMY STORE NG.
// For production: use a database, persistent order records, rate limiting, logging,
// HTTPS, strict validation, webhook signature verification and verified payment status.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
app.use(cors({origin: process.env.FRONTEND_ORIGIN || "http://localhost:5500"}));

const PORT = process.env.PORT || 4242;
const SECRET = process.env.PAYSTACK_SECRET_KEY;
const BANK = {
  bankName: process.env.TRANSFER_BANK_NAME || "Your Bank",
  accountName: process.env.TRANSFER_ACCOUNT_NAME || "BAMMY STORE NG",
  accountNumber: process.env.TRANSFER_ACCOUNT_NUMBER || "0000000000"
};

// Demo product catalogue: server-side prices are authoritative.
// In production, load these from your database/admin catalogue.
const catalogue = {
  1:{name:"Everyday Kitchen Utensil Set",price:12500},2:{name:"Modern Silicone Cooking Tools",price:8500},
  3:{name:"Women's Everyday Flat Slippers",price:9500},4:{name:"Comfort Casual Female Flops",price:7000},
  5:{name:"Classic Corporate Handbag",price:22000},6:{name:"Chic Casual Shoulder Bag",price:18500},
  7:{name:"Elegant Women's Perfume",price:14500},8:{name:"Fresh Men's Fragrance",price:16000},
  9:{name:"Minimal Gold-tone Chain",price:6500},10:{name:"Classic Everyday Ring",price:4500},
  11:{name:"Women's Classic Wristwatch",price:18500},12:{name:"Men's Smart Casual Watch",price:21000}
};
const orders = new Map(); // Replace with a persistent database.

function makeReference(){return "BAMMY-"+Date.now()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();}
function calculateOrder(items){
  if(!Array.isArray(items)||items.length===0)throw new Error("Your cart is empty.");
  return items.reduce((total,item)=>{
    const product=catalogue[Number(item.productId)];
    const qty=Number(item.quantity);
    if(!product||!Number.isInteger(qty)||qty<1||qty>50)throw new Error("Invalid product or quantity.");
    return total+product.price*qty;
  },0);
}
function validateCustomer(customer){
  if(!customer||!customer.name||!customer.phone||!customer.email||!customer.address)throw new Error("Please provide all customer and delivery details.");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))throw new Error("Please provide a valid email address.");
}

app.get("/api/health",(req,res)=>res.json({ok:true,store:"BAMMY STORE NG"}));

app.post("/api/orders",async(req,res)=>{
  try{
    const {customer,items,paymentMethod}=req.body;
    validateCustomer(customer);
    if(!["card","transfer"].includes(paymentMethod))return res.status(400).json({error:"Choose a valid payment method."});
    const amountNaira=calculateOrder(items);
    const reference=makeReference();
    const order={reference,customer,items,amountNaira,paymentMethod,status:"pending",createdAt:new Date().toISOString()};
    orders.set(reference,order);

    if(paymentMethod==="transfer"){
      return res.status(201).json({orderReference:reference,amount:amountNaira,bankDetails:BANK,status:"pending"});
    }
    if(!SECRET||!SECRET.startsWith("sk_"))return res.status(503).json({error:"Payment gateway is not configured. Add your Paystack secret key to server/.env."});

    // Paystack expects amount in kobo (NGN * 100). Never accept the amount from the browser.
    const gatewayResponse=await fetch("https://api.paystack.co/transaction/initialize",{
      method:"POST",
      headers:{"Authorization":`Bearer ${SECRET}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        email:customer.email,amount:amountNaira*100,reference,
        callback_url:`${process.env.FRONTEND_ORIGIN || "http://localhost:5500"}/payment-result.html`
      })
    });
    const gatewayData=await gatewayResponse.json();
    if(!gatewayResponse.ok||!gatewayData.status)throw new Error(gatewayData.message||"Could not initialize payment.");
    order.accessCode=gatewayData.data.access_code;
    res.status(201).json({orderReference:reference,authorizationUrl:gatewayData.data.authorization_url});
  }catch(error){res.status(400).json({error:error.message||"Unable to create order."});}
});

// The browser's return URL is not proof of payment. Verify the reference server-side.
app.get("/api/payments/verify/:reference",async(req,res)=>{
  try{
    if(!SECRET)return res.status(503).json({error:"Payment gateway is not configured."});
    const reference=req.params.reference;
    const order=orders.get(reference);
    if(!order)return res.status(404).json({error:"Order not found."});
    const response=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{
      headers:{"Authorization":`Bearer ${SECRET}`}
    });
    const data=await response.json();
    if(!response.ok||!data.status)throw new Error(data.message||"Verification failed.");
    const verified=data.data.status==="success" && data.data.amount===order.amountNaira*100 && data.data.currency==="NGN";
    if(verified)order.status="paid";
    res.json({orderReference:reference,paid:verified,status:order.status});
  }catch(error){res.status(400).json({error:error.message});}
});

// Paystack webhook: configure this endpoint in your Paystack dashboard.
// Always verify the HMAC signature using your secret key before trusting an event.
app.post("/api/paystack/webhook",express.raw({type:"application/json"}),(req,res)=>{
  if(!SECRET)return res.sendStatus(503);
  const signature=req.headers["x-paystack-signature"];
  const expected=crypto.createHmac("sha512",SECRET).update(req.body).digest("hex");
  if(!signature||signature!==expected)return res.sendStatus(401);
  const event=JSON.parse(req.body.toString());
  if(event.event==="charge.success"){
    const order=orders.get(event.data.reference);
    if(order && event.data.amount===order.amountNaira*100 && event.data.currency==="NGN")order.status="paid";
  }
  res.sendStatus(200);
});

app.use(express.json()); // Register after the raw-body webhook route so signature verification can read the original bytes.\n\napp.listen(PORT,()=>console.log(`BAMMY STORE NG API running on port ${PORT}`));
