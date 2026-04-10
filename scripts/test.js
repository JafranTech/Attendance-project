const fetch = require('node-fetch') || globalThis.fetch;

async function test() {
  const loginRes = await fetch("https://attendance-project-lemon.vercel.app/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "mohamedrasmi86@gmail.com", password: "123456" })
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.log("Login failed", loginData);
    return;
  }
  
  const orderRes = await fetch("https://attendance-project-lemon.vercel.app/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + loginData.token },
    body: JSON.stringify({ plan: "monthly" })
  });
  
  const orderData = await orderRes.text();
  console.log("Order Res Code:", orderRes.status);
  console.log("Order Res Body:", orderData);
}

test();
